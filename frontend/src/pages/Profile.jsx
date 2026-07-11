import { useEffect, useState } from 'react';
import api from '../api';
import '../styles/Profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [clubs, setClubs] = useState([]);

  const role = localStorage.getItem('role');

  useEffect(() => {
    loadProfile();
    if (role === 'Participant') {
      loadClubs();
    }
  }, []);

  const loadProfile = async () => {
    try {
      const endpoint = role === 'Organizer' ? '/organizer/profile' : '/participant/profile';
      const res = await api.get(endpoint);
      setProfile(res.data);
      setForm(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load profile');
    }
  };

  const loadClubs = async () => {
    try {
      const res = await api.get('/participant/clubs');
      setClubs(res.data);
    } catch (err) {
      console.error('Failed to load clubs:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = role === 'Organizer' ? '/organizer/profile' : '/participant/profile';
      const res = await api.put(endpoint, form);
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters');
      return;
    }
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMsg('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleInterestToggle = (interest) => {
    const current = form.interests || [];
    setForm({
      ...form,
      interests: current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest]
    });
  };

  const handleClubToggle = (clubId) => {
    const current = (form.followedClubs || []).map(c => typeof c === 'object' ? c._id : c);
    setForm({
      ...form,
      followedClubs: current.includes(clubId)
        ? current.filter(id => id !== clubId)
        : [...current, clubId]
    });
  };

  if (!profile) return <div className="profile-loading">Loading profile...</div>;

  const interestOptions = ['Tech', 'Music', 'Sports', 'Art', 'Dance', 'Drama', 'Coding', 'Design', 'Photography', 'Gaming'];

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-header">
          <h1> My Profile</h1>
          {!editing && (
            <button className="edit-btn" onClick={() => setEditing(true)}> Edit Profile</button>
          )}
        </div>

        {/* Non-editable info */}
        <div className="profile-section">
          <h3>Account Information</h3>
          <div className="info-row">
            <label>Email</label>
            <span>{profile.email}</span>
          </div>
          <div className="info-row">
            <label>Role</label>
            <span>{profile.__t || profile.role || role}</span>
          </div>
          {role === 'Participant' && (
            <div className="info-row">
              <label>Type</label>
              <span>{profile.type}</span>
            </div>
          )}
        </div>

        {/* Editable fields */}
        {role === 'Participant' && (
          <div className="profile-section">
            <h3>Personal Information</h3>
            {editing ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Number</label>
                    <input value={form.contactNumber || ''} onChange={e => setForm({...form, contactNumber: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>College Name</label>
                    <input value={form.collegeName || ''} onChange={e => setForm({...form, collegeName: e.target.value})} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="info-row"><label>First Name</label><span>{profile.firstName || '—'}</span></div>
                <div className="info-row"><label>Last Name</label><span>{profile.lastName || '—'}</span></div>
                <div className="info-row"><label>Contact</label><span>{profile.contactNumber || '—'}</span></div>
                <div className="info-row"><label>College</label><span>{profile.collegeName || '—'}</span></div>
              </>
            )}
          </div>
        )}

        {role === 'Organizer' && (
          <div className="profile-section">
            <h3>Club Information</h3>
            {editing ? (
              <>
                <div className="form-group">
                  <label>Club Name</label>
                  <input value={form.clubName || ''} disabled className="disabled-input" />
                  <small>Club name cannot be changed</small>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Email</label>
                    <input value={form.contactEmail || ''} onChange={e => setForm({...form, contactEmail: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Contact Number</label>
                    <input value={form.contactNumber || ''} onChange={e => setForm({...form, contactNumber: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Discord Webhook URL</label>
                  <input value={form.discordWebhook || ''} onChange={e => setForm({...form, discordWebhook: e.target.value})} placeholder="https://discord.com/api/webhooks/..." />
                </div>
              </>
            ) : (
              <>
                <div className="info-row"><label>Club Name</label><span>{profile.clubName}</span></div>
                <div className="info-row"><label>Category</label><span>{profile.category || '—'}</span></div>
                <div className="info-row"><label>Description</label><span>{profile.description || '—'}</span></div>
                <div className="info-row"><label>Contact Email</label><span>{profile.contactEmail || '—'}</span></div>
                <div className="info-row"><label>Contact Number</label><span>{profile.contactNumber || '—'}</span></div>
                <div className="info-row"><label>Discord Webhook</label><span>{profile.discordWebhook ? ' Configured' : '—'}</span></div>
              </>
            )}
          </div>
        )}

        {/* Interests section (Participant only) */}
        {role === 'Participant' && (
          <div className="profile-section">
            <h3>Interests</h3>
            {editing ? (
              <div className="chips-container">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    className={`chip ${(form.interests || []).includes(interest) ? 'selected' : ''}`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            ) : (
              <div className="chips-container">
                {(profile.interests || []).length > 0
                  ? profile.interests.map(i => <span key={i} className="chip selected">{i}</span>)
                  : <span className="empty-text">No interests selected</span>
                }
              </div>
            )}
          </div>
        )}

        {/* Followed Clubs (Participant only) */}
        {role === 'Participant' && (
          <div className="profile-section">
            <h3>Followed Clubs</h3>
            {editing ? (
              <div className="chips-container">
                {clubs.map(club => {
                  const followedIds = (form.followedClubs || []).map(c => typeof c === 'object' ? c._id : c);
                  return (
                    <button
                      key={club._id}
                      className={`chip ${followedIds.includes(club._id) ? 'selected' : ''}`}
                      onClick={() => handleClubToggle(club._id)}
                    >
                      {club.clubName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="chips-container">
                {(profile.followedClubs || []).length > 0
                  ? profile.followedClubs.map(c => (
                    <span key={c._id || c} className="chip selected">
                      {typeof c === 'object' ? c.clubName : c}
                    </span>
                  ))
                  : <span className="empty-text">No clubs followed</span>
                }
              </div>
            )}
          </div>
        )}

        {/* Save / Cancel buttons */}
        {editing && (
          <div className="profile-actions">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : ' Save Changes'}
            </button>
            <button className="cancel-btn" onClick={() => { setEditing(false); setForm(profile); }}>
              Cancel
            </button>
          </div>
        )}

        {/* Password Change */}
        <div className="profile-section">
          <h3> Change Password</h3>
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required minLength={6}
                />
              </div>
            </div>
            {passwordMsg && <p className={passwordMsg.includes('success') ? 'success-msg' : 'error-msg'}>{passwordMsg}</p>}
            <button type="submit" className="password-btn">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
