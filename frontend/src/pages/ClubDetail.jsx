import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import '../styles/Clubs.css';

function ClubDetail() {
  const { organizerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followedClubs, setFollowedClubs] = useState([]);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    loadClub();
    if (token && role === 'Participant') {
      loadProfile();
    }
  }, [organizerId]);

  const loadClub = async () => {
    try {
      const res = await api.get(`/participant/clubs/${organizerId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/participant/profile');
      setFollowedClubs((res.data.followedClubs || []).map(c => typeof c === 'object' ? c._id : c));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFollow = async () => {
    try {
      const res = await api.post(`/participant/follow/${organizerId}`);
      setFollowedClubs((res.data.followedClubs || []).map(c => typeof c === 'object' ? c._id : c));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to follow/unfollow');
    }
  };

  if (loading) return <div className="clubs-loading">Loading...</div>;
  if (!data) return <div className="clubs-loading">Club not found</div>;

  const { organizer, events } = data;
  const isFollowing = followedClubs.includes(organizerId);
  const upcomingEvents = events.filter(e => ['Published', 'Ongoing'].includes(e.status));
  const pastEvents = events.filter(e => e.status === 'Completed');

  return (
    <div className="club-detail-container">
      <Link to="/clubs" className="back-link">← Back to Clubs</Link>

      <div className="club-detail-header">
        <div>
          <h1>{organizer.clubName}</h1>
          {organizer.category && <span className="club-category large">{organizer.category}</span>}
        </div>
        {token && role === 'Participant' && (
          <button className={`follow-btn large ${isFollowing ? 'following' : ''}`} onClick={toggleFollow}>
            {isFollowing ? ' Following' : '+ Follow'}
          </button>
        )}
      </div>

      <div className="club-detail-info">
        <p className="club-detail-description">{organizer.description || 'No description available'}</p>
        <div className="club-contact-info">
          {organizer.contactEmail && <p> {organizer.contactEmail}</p>}
          {organizer.contactNumber && <p> {organizer.contactNumber}</p>}
        </div>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="club-events-section">
          <h2> Upcoming Events</h2>
          <div className="club-events-grid">
            {upcomingEvents.map(event => (
              <Link key={event._id} to={`/event/${event._id}`} className="club-event-card">
                <h4>{event.name}</h4>
                <p>{event.description?.substring(0, 100)}...</p>
                <div className="event-meta">
                  <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span>
                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="club-events-section">
          <h2> Past Events</h2>
          <div className="club-events-grid">
            {pastEvents.map(event => (
              <Link key={event._id} to={`/event/${event._id}`} className="club-event-card past">
                <h4>{event.name}</h4>
                <p>{event.description?.substring(0, 100)}...</p>
                <div className="event-meta">
                  <span className="status-badge completed">Completed</span>
                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="no-clubs">This club hasn't created any events yet.</div>
      )}
    </div>
  );
}

export default ClubDetail;
