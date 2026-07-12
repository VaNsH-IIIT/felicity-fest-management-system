import { useEffect, useState } from 'react';
import api from '../api';
import '../styles/AdminPages.css';

function AdminPasswordResets() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/admin/password-resets');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    const confirmMsg = action === 'approve'
      ? 'Approve this password reset? A new password will be generated.'
      : 'Reject this password reset request?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.put(`/admin/password-resets/${requestId}`, { action });
      if (action === 'approve' && res.data.newPassword) {
        alert(`New password for ${res.data.organizerEmail}: ${res.data.newPassword}\n\nPlease share this with the organizer securely.`);
      } else {
        alert('Request ' + action + 'd successfully');
      }
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  if (loading) return <div className="admin-loading">Loading...</div>;

  const pending = requests.filter(r => r.status === 'Pending');
  const resolved = requests.filter(r => r.status !== 'Pending');

  return (
    <div className="admin-container">
      <h1> Password Reset Requests</h1>

      {/* Pending */}
      <div className="admin-section">
        <h2>Pending Requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="empty-text">No pending requests.</p>
        ) : (
          <div className="events-table">
            <table>
              <thead>
                <tr>
                  <th>Organizer</th>
                  <th>Email</th>
                  <th>Reason</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(req => (
                  <tr key={req._id}>
                    <td><strong>{req.organizer?.clubName || 'N/A'}</strong></td>
                    <td>{req.organizer?.email || 'N/A'}</td>
                    <td>{req.reason || '—'}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="action-buttons">
                      <button className="approve-btn" onClick={() => handleAction(req._id, 'approve')}> Approve</button>
                      <button className="reject-btn" onClick={() => handleAction(req._id, 'reject')}> Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="admin-section">
          <h2>Resolved ({resolved.length})</h2>
          <div className="events-table">
            <table>
              <thead>
                <tr>
                  <th>Organizer</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map(req => (
                  <tr key={req._id} className="resolved-row">
                    <td>{req.organizer?.clubName || 'N/A'}</td>
                    <td><span className={`status-badge ${req.status.toLowerCase()}`}>{req.status}</span></td>
                    <td>{req.reason || '—'}</td>
                    <td>{new Date(req.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPasswordResets;
