import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/Clubs.css';

function ClubsListing() {
  const [clubs, setClubs] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    loadClubs();
    if (token && role === 'Participant') {
      loadProfile();
    }
  }, []);

  const loadClubs = async () => {
    try {
      const res = await api.get('/participant/clubs');
      setClubs(res.data);
    } catch (err) {
      console.error('Failed to load clubs:', err);
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

  const toggleFollow = async (clubId) => {
    try {
      const res = await api.post(`/participant/follow/${clubId}`);
      setFollowedClubs((res.data.followedClubs || []).map(c => typeof c === 'object' ? c._id : c));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to follow/unfollow');
    }
  };

  const filteredClubs = clubs.filter(club => {
    if (!search) return true;
    // Fuzzy match: "mh" matches "merch", "marathon", etc.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fuzzyRegex = new RegExp(escaped.split('').join('.*'), 'i');
    return fuzzyRegex.test(club.clubName) ||
      fuzzyRegex.test(club.category || '');
  });

  if (loading) return <div className="clubs-loading">Loading clubs...</div>;

  return (
    <div className="clubs-container">
      <div className="clubs-header">
        <h1> Clubs & Organizations</h1>
        <input
          type="text"
          placeholder="Search clubs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="clubs-search"
        />
      </div>

      <div className="clubs-grid">
        {filteredClubs.map(club => (
          <div key={club._id} className="club-card">
            <div className="club-card-header">
              <h3>{club.clubName}</h3>
              {club.category && <span className="club-category">{club.category}</span>}
            </div>
            <p className="club-description">{club.description || 'No description available'}</p>
            {club.contactEmail && <p className="club-contact"> {club.contactEmail}</p>}
            <div className="club-card-actions">
              <Link to={`/clubs/${club._id}`} className="view-club-btn">View Details</Link>
              {token && role === 'Participant' && (
                <button
                  className={`follow-btn ${followedClubs.includes(club._id) ? 'following' : ''}`}
                  onClick={() => toggleFollow(club._id)}
                >
                  {followedClubs.includes(club._id) ? ' Following' : '+ Follow'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredClubs.length === 0 && (
        <div className="no-clubs">No clubs found matching your search.</div>
      )}
    </div>
  );
}

export default ClubsListing;
