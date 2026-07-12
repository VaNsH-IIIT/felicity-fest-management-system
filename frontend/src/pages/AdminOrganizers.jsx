import { useEffect, useState } from 'react';
import api from '../api';
import '../styles/AdminPages.css';

function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ clubName: '', category: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    loadOrganizers();
  }, []);

  const loadOrganizers = async () => {
    try {
      const res = await api.get('/admin/organizers');
      setOrganizers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreatedInfo(null);
    try {
      const res = await api.post('/admin/organizers', createForm);
      setCreatedInfo(res.data);
      setCreateForm({ clubName: '', category: '', description: '' });
      loadOrganizers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create organizer');
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (id, clubName) => {
    if (!confirm(`Are you sure you want to remove ${clubName}? This will disable their account.`)) return;
    try {
      await api.delete(`/admin/organizers/${id}`);
      alert('Organizer removed');
      loadOrganizers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove organizer');
    }
  };

  if (loading) return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1> Manage Organizers</h1>
        <button className="create-btn" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? ' Cancel' : ' Create Organizer'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="create-form-container">
          <form onSubmit={handleCreate} className="create-form">
            <h3>Create New Organizer</h3>
            <div className="form-group">
              <label>Club Name *</label>
              <input
                value={createForm.clubName}
                onChange={e => setCreateForm({...createForm, clubName: e.target.value})}
                required
                placeholder="Enter club name"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <input
                  value={createForm.category}
                  onChange={e => setCreateForm({...createForm, category: e.target.value})}
                  placeholder="e.g., Tech, Cultural"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={createForm.description}
                  onChange={e => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Brief description"
                />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={creating}>
              {creating ? 'Creating...' : 'Create Organizer'}
            </button>
          </form>

          {createdInfo && createdInfo.credentials && (
            <div className="created-info">
              <h4> Organizer Created!</h4>
              <p><strong>Email:</strong> {createdInfo.credentials.email}</p>
              <p><strong>Password:</strong> {createdInfo.credentials.password}</p>
              <p className="warning-text"> Save these credentials! The password won't be shown again.</p>
            </div>
          )}
        </div>
      )}

      {/* Organizers List */}
      <div className="events-table">
        <table>
          <thead>
            <tr>
              <th>Club Name</th>
              <th>Email</th>
              <th>Category</th>
              <th>Contact Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map(org => (
              <tr key={org._id}>
                <td><strong>{org.clubName}</strong></td>
                <td>{org.email}</td>
                <td>{org.category || '—'}</td>
                <td>{org.contactEmail || '—'}</td>
                <td>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(org._id, org.clubName)}
                  >
                     Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {organizers.length === 0 && (
        <div className="empty-state">No organizers found.</div>
      )}
    </div>
  );
}

export default AdminOrganizers;
