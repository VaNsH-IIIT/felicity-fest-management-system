import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/AdminPages.css';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading...</div>;
  if (!stats) return <div className="admin-loading">Failed to load dashboard</div>;

  return (
    <div className="admin-container">
      <h1> Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalOrganizers}</div>
          <div className="stat-label">Organizers</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalParticipants}</div>
          <div className="stat-label">Participants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalEvents}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalRegistrations}</div>
          <div className="stat-label">Registrations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingResets || 0}</div>
          <div className="stat-label">Pending Resets</div>
        </div>
      </div>

      <div className="admin-links">
        <Link to="/admin/organizers" className="admin-link-card">
          <h3> Manage Clubs</h3>
          <p>Create, view, and remove organizer accounts</p>
        </Link>
        <Link to="/admin/password-resets" className="admin-link-card">
          <h3> Password Resets</h3>
          <p>Handle organizer password reset requests</p>
        </Link>
      </div>
    </div>
  );
}

export default AdminDashboard;
