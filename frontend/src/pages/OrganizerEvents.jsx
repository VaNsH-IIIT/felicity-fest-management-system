import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function OrganizerEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await api.get('/organizer/events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.status === filter);

  if (loading) return <div className="org-loading">Loading events...</div>;

  return (
    <div className="organizer-container">
      <div className="org-page-header">
        <h1> My Events</h1>
        <Link to="/organizer/create-event" className="org-btn org-btn-primary"> Create Event</Link>
      </div>

      <div className="org-filter-bar">
        {['all', 'Draft', 'Published', 'Ongoing', 'Closed', 'Completed'].map(f => (
          <button
            key={f}
            className={`org-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="org-empty">
          <p>No events found.</p>
        </div>
      ) : (
        <div className="org-events-grid">
          {filteredEvents.map(event => (
            <div key={event._id} className="org-event-card">
              <div className="org-event-card-header">
                <h3 className="org-event-card-name">{event.name}</h3>
                <span className={`org-badge ${event.status.toLowerCase()}`}>{event.status}</span>
              </div>
              <div className="org-event-card-meta">
                <span className={`org-type-tag ${event.type.toLowerCase()}`}>{event.type}</span>
                <span className="org-event-regs"> {event.totalRegistrations || 0} registrations</span>
              </div>
              <div className="org-event-card-dates">
                <div><span className="date-label">Start:</span> {new Date(event.startDate).toLocaleDateString()}</div>
                <div><span className="date-label">Deadline:</span> {new Date(event.registrationDeadline).toLocaleDateString()}</div>
              </div>
              <div className="org-event-card-actions">
                <Link to={`/organizer/events/${event._id}`} className="org-btn org-btn-primary org-btn-sm">View</Link>
                {['Draft', 'Published'].includes(event.status) && (
                  <Link to={`/organizer/events/${event._id}/edit`} className="org-btn org-btn-secondary org-btn-sm">Edit</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrganizerEvents;
