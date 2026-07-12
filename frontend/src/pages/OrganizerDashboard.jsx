import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function OrganizerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/organizer/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="org-loading">Loading dashboard...</div>;
  if (!dashboard) return <div className="org-loading">Failed to load dashboard</div>;

  const { events, stats } = dashboard;

  return (
    <div className="org-container">
      <div className="org-header">
        <h1> Organizer Dashboard</h1>
        <Link to="/organizer/create-event" className="create-event-btn"> Create Event</Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalEvents}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalRegistrations}</div>
          <div className="stat-label">Total Registrations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.publishedEvents}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.draftEvents}</div>
          <div className="stat-label">Drafts</div>
        </div>
      </div>

      {/* Events List */}
      <div className="org-section">
        <h2> My Events</h2>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No events created yet.</p>
            <Link to="/organizer/create-event" className="create-event-btn">Create your first event</Link>
          </div>
        ) : (
          <div className="events-table">
            <table>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id}>
                    <td><strong>{event.name}</strong></td>
                    <td><span className={`type-badge ${event.type.toLowerCase()}`}>{event.type}</span></td>
                    <td><span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span></td>
                    <td>{event.totalRegistrations || 0}</td>
                    <td>{new Date(event.startDate).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/organizer/events/${event._id}`} className="action-link">View</Link>
                      {event.status === 'Draft' && (
                        <Link to={`/organizer/events/${event._id}/edit`} className="action-link edit">Edit</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizerDashboard;
