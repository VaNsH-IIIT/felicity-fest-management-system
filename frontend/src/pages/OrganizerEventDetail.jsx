import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function OrganizerEventDetail() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusUpdate, setStatusUpdate] = useState('');

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}`);
      setData(res.data);
      setStatusUpdate(res.data.event.status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      await api.put(`/organizer/events/${eventId}`, { status: statusUpdate });
      alert('Status updated!');
      loadEvent();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}/export-csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `participants_${eventId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  if (loading) return <div className="org-loading">Loading...</div>;
  if (!data) return <div className="org-loading">Event not found</div>;

  const { event, registrations, analytics } = data;

  return (
    <div className="org-container">
      <Link to="/organizer/events" className="back-link">← Back to Events</Link>

      <div className="org-header">
        <div>
          <h1>{event.name}</h1>
          <span className={`status-badge large ${event.status.toLowerCase()}`}>{event.status}</span>
          <span className={`type-badge large ${event.type.toLowerCase()}`}>{event.type}</span>
        </div>
      </div>

      {/* Status Update */}
      <div className="status-update-bar">
        <select value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
          {event.status === 'Draft' && <option value="Draft">Draft</option>}
          {['Draft', 'Published'].includes(event.status) && <option value="Published">Published</option>}
          {/* Ongoing is auto-set by server; only allow manual if already Ongoing */}
          {event.status === 'Ongoing' && <option value="Ongoing">Ongoing</option>}
          {['Ongoing', 'Published'].includes(event.status) && <option value="Closed">Closed</option>}
          {['Ongoing', 'Published', 'Closed'].includes(event.status) && <option value="Completed">Completed</option>}
        </select>
        <button onClick={handleStatusChange} className="update-status-btn">Update Status</button>
        <button onClick={handleExportCSV} className="export-btn"> Export CSV</button>
        {(event.type === 'Merchandise' || event.fee > 0) && (
          <Link to={`/organizer/events/${eventId}/orders`} className="export-btn" style={{ textDecoration: 'none' }}>{event.type === 'Merchandise' ? ' Manage Orders' : ' Payment Approvals'}</Link>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {['overview', 'registrations', 'analytics'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="event-overview">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Description</label>
              <p>{event.description}</p>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <label>Start Date</label>
                <p>{new Date(event.startDate).toLocaleString()}</p>
              </div>
              <div className="detail-item">
                <label>End Date</label>
                <p>{new Date(event.endDate).toLocaleString()}</p>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <label>Registration Deadline</label>
                <p>{new Date(event.registrationDeadline).toLocaleString()}</p>
              </div>
              <div className="detail-item">
                <label>Location</label>
                <p>{event.location || '—'}</p>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-item">
                <label>Fee</label>
                <p>{event.fee > 0 ? `₹${event.fee}` : 'Free'}</p>
              </div>
              <div className="detail-item">
                <label>Capacity</label>
                <p>{event.totalRegistrations || 0} / {event.participantLimit}</p>
              </div>
            </div>
            {event.isTeamEvent && (
              <div className="detail-item">
                <label>Team Event</label>
                <p>Max team size: {event.maxTeamSize}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registrations */}
      {activeTab === 'registrations' && (
        <div className="registrations-section">
          <h3>Total Registrations: {registrations.length}</h3>
          {registrations.length === 0 ? (
            <p className="empty-text">No registrations yet.</p>
          ) : (
            <div className="events-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Participant</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg._id}>
                      <td><code>{reg.ticketId}</code></td>
                      <td>{reg.participant?.email || 'N/A'}</td>
                      <td><span className={`status-badge ${reg.status.toLowerCase()}`}>{reg.status}</span></td>
                      <td><span className={`status-badge ${(reg.paymentStatus || '').toLowerCase()}`}>{reg.paymentStatus || 'N/A'}</span></td>
                      <td>{new Date(reg.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="analytics-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{analytics.totalRegistrations}</div>
              <div className="stat-label">Total Registrations</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{analytics.confirmed}</div>
              <div className="stat-label">Confirmed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{analytics.cancelled}</div>
              <div className="stat-label">Cancelled</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{analytics.checkedIn}</div>
              <div className="stat-label">Checked In</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">₹{analytics.revenue}</div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizerEventDetail;
