import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false); // New loading state

  const navigate = useNavigate();

  const { username, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true); // Set loading to true
    try {
      const res = await axios.post(
        'https://validator-backend-ejesg0auhga8c2c3.eastus-01.azurewebsites.net/api/auth/login',
        formData,
        { timeout: 15000 } // Set timeout to 15 seconds (15000 ms)
      );
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error(err.response.data);
      alert(err.response.data.msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false); // Set loading to false regardless of success or failure
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Username"
          name="username"
          value={username}
          onChange={onChange}
          required
          disabled={loading} // Disable input when loading
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={password}
          onChange={onChange}
          required
          disabled={loading} // Disable input when loading
        />
        <button type="submit" disabled={loading}>Login</button>
      </form>
      {loading && <p style={{ textAlign: 'center', marginTop: '10px' }}>Logging in... Please wait.</p>}
      <p style={{ textAlign: 'center', marginTop: '10px' }}>Don't have an account? <Link to="/register">Register here</Link></p>
    </div>
  );
};

export default Login;

//Prueba de git
