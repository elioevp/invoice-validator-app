const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

async function ensureContainerExists() {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const createContainerResponse = await containerClient.createIfNotExists();
  if (createContainerResponse.succeeded) {
    console.log(`Container '${containerName}' created or already exists.`);
  }
}

ensureContainerExists().catch(console.error);

module.exports = { blobServiceClient, containerName };
