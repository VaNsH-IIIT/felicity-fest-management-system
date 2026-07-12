import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function CreateEvent() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'Normal',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationDeadline: '',
    eligibility: { type: 'All', details: '' },
    fee: 0,
    participantLimit: 100,
    location: '',
    category: '',
    isTeamEvent: false,
    maxTeamSize: 1,
    poster: '',
    tags: '',
    status: 'Draft',
    customForm: [],
    merchandise: { variants: [], totalStock: 0, purchaseLimit: 1, description: '' }
  });

  // Custom form builder
  const addFormField = () => {
    setForm({
      ...form,
      customForm: [
        ...form.customForm,
        { fieldId: `field_${Date.now()}`, fieldType: 'text', label: '', placeholder: '', required: false, options: [] }
      ]
    });
  };

  const updateFormField = (index, updates) => {
    const fields = [...form.customForm];
    fields[index] = { ...fields[index], ...updates };
    setForm({ ...form, customForm: fields });
  };

  const removeFormField = (index) => {
    setForm({ ...form, customForm: form.customForm.filter((_, i) => i !== index) });
  };

  // Merchandise variants
  const addVariant = () => {
    setForm({
      ...form,
      merchandise: {
        ...form.merchandise,
        variants: [
          ...form.merchandise.variants,
          { variantId: `var_${Date.now()}`, name: '', size: '', color: '', price: 0, stock: 0 }
        ]
      }
    });
  };

  const updateVariant = (index, updates) => {
    const variants = [...form.merchandise.variants];
    variants[index] = { ...variants[index], ...updates };
    setForm({ ...form, merchandise: { ...form.merchandise, variants } });
  };

  const removeVariant = (index) => {
    setForm({
      ...form,
      merchandise: {
        ...form.merchandise,
        variants: form.merchandise.variants.filter((_, i) => i !== index)
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      };
      await api.post('/organizer/events', payload);
      alert('Event created successfully!');
      navigate('/organizer/events');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="org-container">
      <h1> Create New Event</h1>

      <div className="tab-bar">
        {['basic', 'dates', 'details', form.type === 'Normal' ? 'form' : 'merchandise'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="create-event-form">
        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="form-section">
            <div className="form-group">
              <label>Event Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Event Type *</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Normal">Normal</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Tech, Cultural" />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="hackathon, coding, tech" />
            </div>

          </div>
        )}

        {/* Dates Tab */}
        {activeTab === 'dates' && (
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Registration Start Date</label>
                <input type="datetime-local" value={form.registrationStartDate} onChange={e => setForm({...form, registrationStartDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Registration Deadline *</label>
                <input type="datetime-local" value={form.registrationDeadline} onChange={e => setForm({...form, registrationDeadline: e.target.value})} required />
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Eligibility</label>
                <select value={form.eligibility.type} onChange={e => setForm({...form, eligibility: {...form.eligibility, type: e.target.value}})}>
                  <option value="All">All</option>
                  <option value="IIIT">IIIT Students Only</option>
                  <option value="Non-IIIT">Non-IIIT Only</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {form.eligibility.type === 'Custom' && (
                <div className="form-group">
                  <label>Custom Eligibility Details</label>
                  <input value={form.eligibility.details || ''} onChange={e => setForm({...form, eligibility: {...form.eligibility, details: e.target.value}})} />
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fee (₹)</label>
                <input type="number" min="0" value={form.fee} onChange={e => setForm({...form, fee: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label>Participant Limit *</label>
                <input type="number" min="1" value={form.participantLimit} onChange={e => setForm({...form, participantLimit: parseInt(e.target.value) || 1})} required />
              </div>
            </div>
            {form.type !== 'Merchandise' && (
            <div className="form-row">
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={form.isTeamEvent} onChange={e => setForm({...form, isTeamEvent: e.target.checked})} />
                  {' '}Team Event
                </label>
              </div>
              {form.isTeamEvent && (
                <div className="form-group">
                  <label>Max Team Size</label>
                  <input type="number" min="2" value={form.maxTeamSize} onChange={e => setForm({...form, maxTeamSize: parseInt(e.target.value) || 2})} />
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* Custom Form Tab (Normal events) */}
        {activeTab === 'form' && form.type === 'Normal' && (
          <div className="form-section">
            <div className="section-header">
              <h3> Registration Form Fields</h3>
              <button type="button" className="add-field-btn" onClick={addFormField}>+ Add Field</button>
            </div>
            {form.customForm.map((field, idx) => (
              <div key={field.fieldId} className="field-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>Label</label>
                    <input value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })} placeholder="Field label" />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={field.fieldType} onChange={e => updateFormField(idx, { fieldType: e.target.value })}>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Placeholder</label>
                    <input value={field.placeholder || ''} onChange={e => updateFormField(idx, { placeholder: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, { required: e.target.checked })} />
                      {' '}Required
                    </label>
                  </div>
                </div>
                {['select', 'checkbox'].includes(field.fieldType) && (
                  <div className="form-group">
                    <label>Options (comma-separated)</label>
                    <input value={(field.options || []).join(', ')} onChange={e => updateFormField(idx, { options: e.target.value.split(',').map(o => o.trim()) })} />
                  </div>
                )}
                <button type="button" className="remove-field-btn" onClick={() => removeFormField(idx)}> Remove</button>
              </div>
            ))}
            {form.customForm.length === 0 && <p className="empty-text">No custom form fields. Click "Add Field" to create one.</p>}
          </div>
        )}

        {/* Merchandise Tab */}
        {activeTab === 'merchandise' && form.type === 'Merchandise' && (
          <div className="form-section">
            <div className="form-group">
              <label>Merchandise Description</label>
              <textarea value={form.merchandise.description} onChange={e => setForm({...form, merchandise: {...form.merchandise, description: e.target.value}})} rows={2} />
            </div>
            <div className="form-group">
              <label>Purchase Limit per Person</label>
              <input type="number" min="1" value={form.merchandise.purchaseLimit} onChange={e => setForm({...form, merchandise: {...form.merchandise, purchaseLimit: parseInt(e.target.value) || 1}})} />
            </div>

            <div className="section-header">
              <h3> Variants</h3>
              <button type="button" className="add-field-btn" onClick={addVariant}>+ Add Variant</button>
            </div>
            {form.merchandise.variants.map((variant, idx) => (
              <div key={variant.variantId} className="field-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input value={variant.name} onChange={e => updateVariant(idx, { name: e.target.value })} placeholder="e.g., T-Shirt M" />
                  </div>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input type="number" min="0" value={variant.price} onChange={e => updateVariant(idx, { price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Size</label>
                    <input value={variant.size || ''} onChange={e => updateVariant(idx, { size: e.target.value })} placeholder="S, M, L, XL" />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input value={variant.color || ''} onChange={e => updateVariant(idx, { color: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input type="number" min="0" value={variant.stock} onChange={e => updateVariant(idx, { stock: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <button type="button" className="remove-field-btn" onClick={() => removeVariant(idx)}> Remove</button>
              </div>
            ))}
            {form.merchandise.variants.length === 0 && <p className="empty-text">No variants. Click "Add Variant" to create one.</p>}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Creating...' : ' Create Event'}
          </button>
          <button type="button" className="cancel-btn" onClick={() => navigate('/organizer/events')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default CreateEvent;
