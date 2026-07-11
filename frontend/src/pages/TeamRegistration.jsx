import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import '../styles/TeamPages.css';

function TeamRegistration() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamSize, setTeamSize] = useState(2);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const [eventRes, teamsRes] = await Promise.all([
        api.get(`/events/details/${eventId}`),
        api.get('/teams/my-teams')
      ]);
      setEvent(eventRes.data);
      setTeamSize(eventRes.data.maxTeamSize || 2);
      const allTeams = teamsRes.data;
      const eventTeam = allTeams.find(t => t.event?._id === eventId);
      setMyTeam(eventTeam || null);
      setTeams(allTeams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teams/create', { eventId, teamName, teamSize });
      alert(`Team created! Invite code: ${res.data.inviteCode}`);
      setShowCreate(false);
      setTeamName('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create team');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teams/join', { inviteCode });
      alert('Joined team!');
      setShowJoin(false);
      setInviteCode('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join team');
    }
  };

  const handleRegisterTeam = async () => {
    if (!myTeam) return;
    try {
      const res = await api.post(`/teams/${myTeam._id}/register`);
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register team');
    }
  };

  const handleLeaveTeam = async () => {
    if (!myTeam) return;
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
      await api.post(`/teams/${myTeam._id}/leave`);
      alert('Left the team');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave team');
    }
  };

  const handleDeleteTeam = async () => {
    if (!myTeam) return;
    if (!confirm('Delete this team? This cannot be undone.')) return;
    try {
      await api.delete(`/teams/${myTeam._id}`);
      alert('Team deleted');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete team');
    }
  };

  const copyInviteCode = () => {
    if (myTeam?.inviteCode) {
      navigator.clipboard.writeText(myTeam.inviteCode);
      alert('Invite code copied!');
    }
  };

  if (loading) return <div className="team-loading">Loading...</div>;
  if (!event) return <div className="team-loading">Event not found</div>;

  return (
    <div className="team-container">
      <Link to={`/event/${eventId}`} className="back-link">← Back to Event</Link>

      <div className="team-header">
        <h1> Team Registration</h1>
        <p className="event-name">{event.name}</p>
        <p className="team-info">Max team size: {event.maxTeamSize} members</p>
      </div>

      {/* My Team Section */}
      {myTeam ? (
        <div className="my-team-section">
          <h2>Your Team: {myTeam.name}</h2>
          <div className="team-card active">
            <div className="team-card-header">
              <span className={`status-badge ${myTeam.status.toLowerCase()}`}>{myTeam.status}</span>
              <div className="invite-code-section">
                <span className="invite-label">Invite Code:</span>
                <code className="invite-code">{myTeam.inviteCode}</code>
                <button className="copy-btn" onClick={copyInviteCode}> Copy</button>
              </div>
            </div>

            <div className="members-list">
              <h4>Members ({myTeam.members.filter(m => m.status === 'Accepted').length}/{myTeam.maxSize})</h4>
              {myTeam.members.map((member, idx) => (
                <div key={idx} className="member-item">
                  <span className="member-name">
                    {member.user?.firstName} {member.user?.lastName || member.user?.email}
                  </span>
                  <span className={`member-status ${member.status.toLowerCase()}`}>{member.status}</span>
                  {(myTeam.leader === member.user?._id || myTeam.leader?._id === member.user?._id) && <span className="leader-badge"> Leader</span>}
                </div>
              ))}
            </div>

            <div className="team-actions">
              {myTeam.status !== 'Complete' && (
                <p style={{ fontSize: '13px', color: '#f59e0b', marginBottom: '8px' }}>
                   Team needs {myTeam.maxSize - myTeam.members.filter(m => m.status === 'Accepted').length} more member(s) before you can register. Share the invite code!
                </p>
              )}
              <button
                className={`register-team-btn ${myTeam.status !== 'Complete' ? 'disabled' : ''}`}
                onClick={handleRegisterTeam}
                disabled={myTeam.status !== 'Complete'}
              >
                 Register Team for Event
              </button>
              {event.fee > 0 && myTeam.status === 'Complete' && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                   Each member will need to upload payment proof (₹{event.fee}) after registration.
                </p>
              )}
              <button className="leave-btn" onClick={handleLeaveTeam}>Leave Team</button>
              <button className="delete-btn" onClick={handleDeleteTeam}> Delete Team</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-team-section">
          <p>You don't have a team for this event yet.</p>
          <div className="team-action-buttons">
            <button className="create-team-btn" onClick={() => { setShowCreate(true); setShowJoin(false); }}>
               Create a Team
            </button>
            <button className="join-team-btn" onClick={() => { setShowJoin(true); setShowCreate(false); }}>
               Join with Invite Code
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreateTeam} className="team-form">
              <h3>Create a New Team</h3>
              <div className="form-group">
                <label>Team Name</label>
                <input value={teamName} onChange={e => setTeamName(e.target.value)} required placeholder="Enter team name" />
              </div>
              <div className="form-group">
                <label>Team Size (2–{event.maxTeamSize})</label>
                <input
                  type="number"
                  min={2}
                  max={event.maxTeamSize}
                  value={teamSize}
                  onChange={e => setTeamSize(parseInt(e.target.value) || 2)}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Your team must be fully formed before you can register.</small>
              </div>
              <button type="submit" className="submit-btn">Create Team</button>
              <button type="button" className="cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
            </form>
          )}

          {showJoin && (
            <form onSubmit={handleJoinTeam} className="team-form">
              <h3>Join a Team</h3>
              <div className="form-group">
                <label>Invite Code</label>
                <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} required placeholder="Enter invite code" />
              </div>
              <button type="submit" className="submit-btn">Join Team</button>
              <button type="button" className="cancel-btn" onClick={() => setShowJoin(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamRegistration;
