import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formLocked, setFormLocked] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}`);
      const event = res.data.event;
      setFormLocked(res.data.formLocked || false);
      setForm({
        ...event,
        startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
        endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
        registrationStartDate: event.registrationStartDate ? new Date(event.registrationStartDate).toISOString().slice(0, 16) : '',
        registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
        tags: (event.tags || []).join(', '),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      };
      // Remove populated fields
      delete payload.organizer;
      delete payload.__v;
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      
      // Remove locked form fields if formLocked to avoid backend rejection
      if (formLocked) {
        delete payload.customForm;
        delete payload.merchandise;
      }
      
      await api.put(`/organizer/events/${eventId}`, payload);
      alert('Event updated!');
      navigate(`/organizer/events/${eventId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="org-loading">Loading...</div>;

  const isDraft = form.status === 'Draft';

  return (
    <div className="org-container">
      <h1> Edit Event: {form.name}</h1>
      {!isDraft && (
        <div className="warning-banner">
           This event is {form.status}. Only limited fields can be edited.
        </div>
      )}
      {formLocked && (
        <div className="warning-banner">
           Registration form and merchandise settings are locked — registrations have been received.
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-event-form">
        <div className="form-section">
          <div className="form-group">
            <label>Event Name</label>
            <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} disabled={!isDraft} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={4} disabled={!isDraft} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {form.status === 'Draft' && <option value="Draft">Draft</option>}
                {['Draft', 'Published'].includes(form.status) && <option value="Published">Published</option>}
                {form.status === 'Ongoing' && <option value="Ongoing">Ongoing</option>}
                {['Ongoing', 'Published'].includes(form.status) && <option value="Closed">Closed</option>}
                {['Ongoing', 'Published', 'Closed'].includes(form.status) && <option value="Completed">Completed</option>}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} disabled={!isDraft} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} disabled={!isDraft} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Registration Deadline</label>
              <input type="datetime-local" value={form.registrationDeadline} onChange={e => setForm({...form, registrationDeadline: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Participant Limit</label>
              <input type="number" min="1" value={form.participantLimit || ''} onChange={e => setForm({...form, participantLimit: parseInt(e.target.value) || 1})} />
            </div>
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input value={form.tags || ''} onChange={e => setForm({...form, tags: e.target.value})} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Saving...' : ' Save Changes'}
          </button>
          <button type="button" className="cancel-btn" onClick={() => navigate(`/organizer/events/${eventId}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default EditEvent;
