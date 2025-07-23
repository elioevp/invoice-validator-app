import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const Dashboard = () => {
  const [directoryName, setDirectoryName] = useState('');
  const [currentPath, setCurrentPath] = useState(''); // To keep track of the current directory
  const [items, setItems] = useState([]); // To store listed directories and files
  const [selectedFile, setSelectedFile] = useState(null);
  const [username, setUsername] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState(null); // New state for image preview
  const [previewFileName, setPreviewFileName] = useState(null); // New state for previewed file name

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      const res = await axios.get(`https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/directory/list?path=${currentPath}`, config);
      setItems(res.data);
    } catch (err) {
      console.error(err.response.data);
      alert(err.response.data.msg || 'Failed to fetch items');
    }
  }, [currentPath]);

  useEffect(() => {
    fetchItems();

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUsername(decoded.user.username);
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  }, [currentPath, fetchItems]);

  const handleDirectoryNameChange = e => setDirectoryName(e.target.value);
  const handleFileChange = e => setSelectedFile(e.target.files[0]);

  const handleCreateDirectory = async e => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      const body = { directoryName: `${currentPath}${directoryName}` };
      const res = await axios.post('https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/directory/create', body, config);
      console.log(res.data);
      alert('Directory created successfully!');
      setDirectoryName('');
      fetchItems();
    } catch (err) {
      console.error(err.response.data);
      alert(err.response.data.msg || 'Failed to create directory');
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('currentPath', currentPath);

      const config = {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      };

      const res = await axios.post('https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/directory/upload', formData, config);
      console.log(res.data);
      alert('File uploaded successfully!');
      setSelectedFile(null);
      fetchItems();
    } catch (err) {
      console.error(err.response.data);
      alert(err.response.data.msg || 'Failed to upload file');
    }
  };

  const navigateToDirectory = (name) => {
    setCurrentPath(`${currentPath}${name}/`);
    setPreviewImageUrl(null); // Clear preview when navigating
    setPreviewFileName(null); // Clear file name when navigating
  };

  const navigateBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.length > 0 ? `${pathParts.join('/')}/` : '');
    setPreviewImageUrl(null); // Clear preview when navigating
    setPreviewFileName(null); // Clear file name when navigating
  };

  const handleItemClick = async (item) => {
    if (item.type === 'directory') {
      navigateToDirectory(item.name);
    } else if (item.type === 'file') {
      const fileExtension = item.name.split('.').pop().toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

      if (imageExtensions.includes(fileExtension)) {
        try {
          const token = localStorage.getItem('token');
          const config = {
            headers: {
              'x-auth-token': token
            }
          };
          const res = await axios.get(`https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/directory/view-image?fileName=${item.name}&currentPath=${currentPath}`, config);
          setPreviewImageUrl(res.data.sasUrl);
          setPreviewFileName(item.name); // Set the file name
        } catch (err) {
          console.error(err.response.data);
          alert(err.response.data.msg || 'Failed to get image preview.');
        }
      } else {
        alert('Only image files (jpg, jpeg, png, gif, bmp, webp) can be previewed.');
        setPreviewImageUrl(null);
        setPreviewFileName(null);
      }
    }
  };

  const handleDeleteFile = async (fileName) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          },
          data: { fileName, currentPath } // Send data in body for DELETE request
        };
        await axios.delete('https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/directory/delete-file', config);
        alert('File deleted successfully!');
        fetchItems(); // Refresh the list
        setPreviewImageUrl(null); // Clear preview if deleted file was being previewed
        setPreviewFileName(null); // Clear file name
      } catch (err) {
        console.error(err.response.data);
        alert(err.response.data.msg || 'Failed to delete file');
      }
    }
  };

  const closePreview = () => {
    setPreviewImageUrl(null);
    setPreviewFileName(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {username && <p style={{ marginRight: '10px', color: 'red' }}>Welcome, {username}!</p>}
        <button onClick={logout}>Logout</button>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Panel: File List and Controls */}
        <div style={{ flex: 1, padding: '20px', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
          <h3>Current Path: /{currentPath}</h3>
          {currentPath && <button onClick={navigateBack}>Back</button>}

          <h4>Create Directory</h4>
          <form onSubmit={handleCreateDirectory}>
            <input
              type="text"
              placeholder="New Directory Name"
              name="directoryName"
              value={directoryName}
              onChange={handleDirectoryNameChange}
              required
            />
            <button type="submit">Create Directory</button>
          </form>

          <h4>Upload File</h4>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUploadFile}>Upload File</button>

          <h4>Contents</h4>
          {items.length === 0 ? (
            <p>No items in this directory.</p>
          ) : (
            <ul>
              {items.map((item, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.type === 'directory' ? (
                    <span onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>📁 {item.name}/</span>
                  ) : (
                    <span onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>📄 {item.name}</span>
                  )}
                  {item.type === 'file' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(item.name); }} style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', padding: '5px 10px', cursor: 'pointer' }}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Panel: Image Preview */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {previewImageUrl ? (
            <>
              <h3>Image Preview</h3>
              {previewFileName && <p>File: <strong>{previewFileName}</strong></p>}
              <img src={previewImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80%', objectFit: 'contain' }} />
              <button onClick={closePreview} style={{ marginTop: '10px' }}>Close Preview</button>
            </>
          ) : (
            <p>Click on an image file to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;