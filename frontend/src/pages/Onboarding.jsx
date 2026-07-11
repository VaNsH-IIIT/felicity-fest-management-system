import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/AuthPages.css';

const interestOptions = [
  'Tech', 'Music', 'Sports', 'Art', 'Dance', 'Drama',
  'Photography', 'Gaming', 'Literature', 'Science', 'Business', 'Social'
];

function Onboarding() {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await api.get('/participant/clubs');
        setAvailableClubs(res.data);
      } catch (err) {
        console.error('Error fetching clubs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const toggleInterest = (interest) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleClub = (clubId) => {
    setFollowedClubs(prev =>
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const savePreferences = async () => {
    try {
      await api.post('/participant/preferences', { interests, followedClubs });
      navigate('/dashboard');
    } catch (err) {
      console.error(err.response?.data);
      alert(err.response?.data?.message || 'Failed to save preferences');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <h1> Welcome!</h1>
          <p>Let's personalize your experience</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Select Your Interests</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {interestOptions.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: interests.includes(interest) ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  background: interests.includes(interest) ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: interests.includes(interest) ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Follow Clubs (optional)</h3>
          {loading ? (
            <p>Loading clubs...</p>
          ) : availableClubs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No clubs available yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableClubs.map(club => (
                <label
                  key={club._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: followedClubs.includes(club._id) ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                    background: followedClubs.includes(club._id) ? 'rgba(102,126,234,0.1)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={followedClubs.includes(club._id)}
                    onChange={() => toggleClub(club._id)}
                  />
                  <div>
                    <strong>{club.clubName}</strong>
                    {club.category && <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>({club.category})</span>}
                    {club.description && <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{club.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="auth-btn" onClick={savePreferences} style={{ flex: 1 }}>
            Save Preferences
          </button>
          <button
            className="auth-btn"
            onClick={async () => {
              try {
                await api.post('/participant/preferences', { interests: [], followedClubs: [] });
              } catch (e) { /* ignore */ }
              navigate('/dashboard');
            }}
            style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
