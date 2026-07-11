import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/BrowseEvents.css';

function BrowseEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clubs, setClubs] = useState([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [followedClubs, setFollowedClubs] = useState([]);

  // Fetch trending events and clubs list
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [trendingRes, clubsRes] = await Promise.all([
          api.get('/events/trending'),
          api.get('/events/clubs')
        ]);
        setTrending(trendingRes.data);
        setClubs(clubsRes.data);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    fetchInitial();
  }, []);

  // Fetch events with filters
  useEffect(() => {
    fetchEvents();
  }, [page, search, type, eligibility, startDate, endDate, followedClubs]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (type) params.append('type', type);
      if (eligibility) params.append('eligibility', eligibility);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (followedClubs.length > 0) {
        params.append('followedClubs', JSON.stringify(followedClubs));
      }

      const res = await api.get(`/events/browse?${params}`);
      setEvents(res.data.events);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Error fetching events:', err);
      alert('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId) => {
    try {
      const res = await api.post(`/events/${eventId}/register`, {});
      alert(` Registered successfully! Ticket ID: ${res.data.ticketId}`);
      fetchEvents();
    } catch (err) {
      console.error('Registration error:', err);
      alert(err.response?.data?.error || 'Failed to register');
    }
  };

  const handleClubFilter = (club) => {
    setFollowedClubs(prev =>
      prev.includes(club)
        ? prev.filter(c => c !== club)
        : [...prev, club]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setEligibility('');
    setStartDate('');
    setEndDate('');
    setFollowedClubs([]);
    setPage(1);
  };

  return (
    <div className="browse-container">
      {/* Trending Section */}
      <section className="trending-section">
        <h2> Trending Events (Last 24h)</h2>
        <div className="trending-grid">
          {trending.length > 0 ? (
            trending.map(event => (
              <div key={event._id} className="trending-card">
                {event.poster && <img src={event.poster} alt={event.name} />}
                <h3>{event.name}</h3>
                <p className="registration-count"> {event.registrationCount} registrations</p>
                <p className="event-type">{event.type}</p>
              </div>
            ))
          ) : (
            <p>No trending events yet</p>
          )}
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <h2> Browse Events</h2>

        <div className="filter-group">
          <input
            type="text"
            placeholder="Search events by name, description, or category..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Event Type</label>
            <select value={type} onChange={e => {
              setType(e.target.value);
              setPage(1);
            }}>
              <option value="">All Types</option>
              <option value="Normal">Normal</option>
              <option value="Merchandise">Merchandise</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Eligibility</label>
            <select value={eligibility} onChange={e => {
              setEligibility(e.target.value);
              setPage(1);
            }}>
              <option value="">All</option>
              <option value="IIIT">IIIT Only</option>
              <option value="Non-IIIT">Non-IIIT</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {clubs.length > 0 && (
          <div className="filter-group">
            <label>Filter by Club</label>
            <div className="club-checkboxes">
              {clubs.map(club => (
                <label key={club._id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={followedClubs.includes(club._id)}
                    onChange={() => handleClubFilter(club._id)}
                  />
                  {club.clubName}
                </label>
              ))}
            </div>
          </div>
        )}

        <button onClick={clearFilters} className="clear-btn">
          Clear Filters
        </button>
      </section>

      {/* Events List */}
      <section className="events-section">
        <h2>Events ({events.length} found)</h2>

        {loading ? (
          <p>Loading events...</p>
        ) : events.length > 0 ? (
          <div className="events-list">
            {events.map(event => (
              <div key={event._id} className="event-card">
                {event.poster && <img src={event.poster} alt={event.name} className="event-poster" />}
                <div className="event-content">
                  <h3>{event.name}</h3>
                  <p className="event-desc">{event.description}</p>

                  <div className="event-details">
                    <span className="event-type"> {event.type}</span>
                    <span className="event-category"> {event.category}</span>
                    <span className="event-eligibility"> {event.eligibility?.type || 'All'}</span>
                  </div>

                  <div className="event-dates">
                    <span> Start: {new Date(event.startDate).toLocaleDateString()}</span>
                    <span> End: {new Date(event.endDate).toLocaleDateString()}</span>
                  </div>

                  <div className="event-footer">
                    <div>
                      <span className="fee"> {event.fee > 0 ? `₹${event.fee}` : 'Free'}</span>
                      <span className="spots">
                        Spots: {event.totalRegistrations}/{event.participantLimit}
                      </span>
                    </div>
                    <div className="button-group">
                      <button
                        onClick={() => navigate(`/event/${event._id}`)}
                        className="details-btn"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => navigate(`/event/${event._id}`)}
                        className="register-btn"
                        disabled={event.totalRegistrations >= event.participantLimit}
                      >
                        {event.totalRegistrations >= event.participantLimit ? 'Full' : 'Register'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No events found. Try adjusting your filters.</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default BrowseEvents;
