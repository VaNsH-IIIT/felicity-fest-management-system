import api from './api';

const login = async (email, password) => {
try {
const res = await api.post('/auth/login', {
email,
password
});

// Save token
localStorage.setItem('token', res.data.token);

alert('Login successful!');

} catch (err) {
alert('Login failed');
}
};
