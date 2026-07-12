import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/AuthPages.css';

function OrganizerPasswordReset() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/organizer/request-password-reset', { email, reason });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2> Request Submitted</h2>
          <p>Your password reset request has been submitted. The admin will review it and you will receive a new password once approved.</p>
          <Link to="/login" className="auth-link">← Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2> Request Password Reset</h2>
        <p className="auth-subtitle">For organizer accounts only. Submit a request and the admin will review it.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Your organizer email"
            />
          </div>
          <div className="form-group">
            <label>Reason for Reset</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need a password reset?"
              rows={3}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default OrganizerPasswordReset;
