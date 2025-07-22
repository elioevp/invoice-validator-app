const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { blobServiceClient, containerName } = require('../config/azure');
const multer = require('multer');
const { Readable } = require('stream');
const { StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

// Get Azure Storage account name and key from connection string
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountNameMatch = /AccountName=([^;]+)/i.exec(connectionString);
const accountKeyMatch = /AccountKey=([^;]+)/i.exec(connectionString);

const accountName = accountNameMatch ? accountNameMatch[1] : null;
const accountKey = accountKeyMatch ? accountKeyMatch[1] : null;

let sharedKeyCredential = null;
if (accountName && accountKey) {
  sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
} else {
  console.error("Azure Storage Account Name or Key not found in connection string.");
}

// Multer setup for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Create Directory
router.post('/create', auth, async (req, res) => {
  const { directoryName } = req.body;
  const userId = req.user.id;

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${userId}/${directoryName}/.placeholder`; // Create a placeholder file to simulate a directory
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload('', 0);

    res.status(201).json({ msg: 'Directory created successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Upload File
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  const { currentPath } = req.body; // This will be the path where the file should be uploaded (e.g., 'my_folder/')
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${userId}/${currentPath || ''}${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const stream = Readable.from(file.buffer);
    await blockBlobClient.uploadStream(stream, file.buffer.length);

    res.status(200).json({ msg: 'File uploaded successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// List Directories and Files
router.get('/list', auth, async (req, res) => {
  const { path = '' } = req.query; // Current path to list (e.g., 'my_folder/')
  const userId = req.user.id;

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const prefix = `${userId}/${path}`;

    let items = [];
    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix })) {
      if (item.kind === 'prefix') {
        // It's a directory
        const dirName = item.name.substring(prefix.length).replace('/', '');
        if (dirName) { // Avoid adding empty string for root prefix
          items.push({ name: dirName, type: 'directory' });
        }
      } else { 
        // It's a file
        const fileName = item.name.substring(prefix.length);
        if (fileName && fileName !== '.placeholder') { // Exclude the .placeholder file
          items.push({ name: fileName, type: 'file' });
        }
      }
    }
    res.status(200).json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get SAS URL for image view
router.get('/view-image', auth, async (req, res) => {
  const { fileName, currentPath } = req.query;
  const userId = req.user.id;

  if (!fileName || !currentPath) {
    return res.status(400).json({ msg: 'File name and current path are required.' });
  }

  if (!sharedKeyCredential) {
    return res.status(500).json({ msg: 'Azure Storage Shared Key Credential not available.' });
  }

  try {
    const blobName = `${userId}/${currentPath}${fileName}`;
    const blobClient = blobServiceClient.getContainerClient(containerName).getBlobClient(blobName);

    const sasOptions = {
      containerName: containerName,
      blobName: blobName,
      permissions: BlobSASPermissions.parse('r'), // Read permission
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + (5 * 60 * 1000)), // 5 minutes access
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const sasUrl = `${blobClient.url}?${sasToken}`;

    res.status(200).json({ sasUrl });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete File
router.delete('/delete-file', auth, async (req, res) => {
  const { fileName, currentPath } = req.body;
  const userId = req.user.id;

  if (!fileName || !currentPath) {
    return res.status(400).json({ msg: 'File name and current path are required.' });
  }

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${userId}/${currentPath}${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();

    res.status(200).json({ msg: 'File deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
