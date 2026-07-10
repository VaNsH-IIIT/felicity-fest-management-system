import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
baseURL: API_BASE,
timeout: 10000
});

// Automatically attach token to every request
api.interceptors.request.use((config) => {
const token = localStorage.getItem('token');

if (token) {
config.headers.Authorization = `Bearer ${token}`;
}

return config;
});

// Response error handler
api.interceptors.response.use(
(response) => response,
(error) => {
if (!error.response) {
console.error('Network error:', error.message);
error.message = 'Network error: Could not connect to server.';
}
return Promise.reject(error);
}
);

export default api;
