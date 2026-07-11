import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '../api';
import '../styles/AuthPages.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    contactNumber: '',
    collegeName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      alert('First name and last name are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (!captchaToken) {
      alert('Please complete the CAPTCHA verification');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        collegeName: formData.collegeName,
        captchaToken
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      alert(' Signup successful!');
      navigate('/onboarding');
    } catch (err) {
      console.error('Signup error:', err);
      let errorMsg = 'Signup failed';
      
      if (err.code === 'ECONNREFUSED' || !err.response) {
        errorMsg = 'Network error: Backend server is not running';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      alert(` ${errorMsg}`);
      setCaptchaToken(null);
      if (captchaRef.current) captchaRef.current.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1> Sign Up</h1>
          <p>Create your Fest Events account</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input id="firstName" name="firstName" type="text" placeholder="First name" value={formData.firstName} onChange={handleChange} disabled={isLoading} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input id="lastName" name="lastName" type="text" placeholder="Last name" value={formData.lastName} onChange={handleChange} disabled={isLoading} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input id="email" name="email" type="email" placeholder="Enter your email (IIIT emails auto-detected)" value={formData.email} onChange={handleChange} disabled={isLoading} required />
          </div>

          <div className="form-group">
            <label htmlFor="contactNumber">Contact Number</label>
            <input id="contactNumber" name="contactNumber" type="tel" placeholder="Your phone number" value={formData.contactNumber} onChange={handleChange} disabled={isLoading} />
          </div>

          <div className="form-group">
            <label htmlFor="collegeName">College / Organization</label>
            <input id="collegeName" name="collegeName" type="text" placeholder="Your college or organization" value={formData.collegeName} onChange={handleChange} disabled={isLoading} />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} disabled={isLoading} required />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} disabled={isLoading} required />
          </div>

          <div className="captcha-container">
            <ReCAPTCHA
              ref={captchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? ' Creating account...' : ' Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
