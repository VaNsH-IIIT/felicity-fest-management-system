import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../styles/EventDetails.css';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/events/details/${eventId}`);
        setEvent(response.data);
        
        // Initialize form data for custom fields
        if (response.data.customForm) {
          const initialData = {};
          response.data.customForm.forEach(field => {
            initialData[field.fieldId] = '';
          });
          setFormData(initialData);
        }

        // Check if already registered (only if logged in)
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const myEventsResponse = await api.get('/events/my-events');
            const existingReg = myEventsResponse.data.find(reg => 
              (reg.event?._id === eventId) || (reg.event === eventId)
            );
            if (existingReg) {
              setIsRegistered(true);
              setRegistrationStatus(existingReg.status);
              setProofUploaded(!!existingReg.paymentProofUploaded);
            }
          } catch (regErr) {
            console.warn('Could not check registration status:', regErr);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleFormChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleVariantSelection = (variantId) => {
    const variant = event.merchandise?.variants?.find(v => v.variantId === variantId);
    // Block selecting out-of-stock variants
    if (variant && variant.stock <= 0) return;

    const purchaseLimit = event.merchandise?.purchaseLimit || 1;

    setSelectedVariants(prev => {
      if (prev.includes(variantId)) {
        return prev.filter(v => v !== variantId);
      } else {
        // Enforce purchase limit
        if (prev.length >= purchaseLimit) {
          setError(`You can select at most ${purchaseLimit} variant(s) per order`);
          return prev;
        }
        setError('');
        return [...prev, variantId];
      }
    });
  };

  const handleRegister = async () => {
    if (isRegistered) {
      setError('You are already registered for this event');
      return;
    }

    const deadline = event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
    if (deadline) {
      setError('Registration deadline has passed');
      return;
    }

    // Validate custom form fields (Normal events)
    if (event.type === 'Normal' && event.customForm && event.customForm.length > 0) {
      for (const field of event.customForm) {
        if (field.required) {
          const val = formData[field.fieldId];
          if (val === undefined || val === null || val === '' || val === false) {
            setError(`Please fill in the required field: ${field.label}`);
            return;
          }
        }
      }
    }

    // Validate merchandise variant selection
    if (event.type === 'Merchandise') {
      if (selectedVariants.length === 0) {
        setError('Please select at least one merchandise variant before registering');
        return;
      }
      // Double-check stock
      for (const vid of selectedVariants) {
        const variant = event.merchandise?.variants?.find(v => v.variantId === vid);
        if (variant && variant.stock <= 0) {
          setError(`${variant.name} is out of stock. Please deselect it.`);
          return;
        }
      }
    }

    try {
      setRegistering(true);
      setError('');

      const registrationData = {
        formResponses: formData,
        selectedVariants: selectedVariants
      };

      const response = await api.post(
        `/events/${eventId}/register`,
        registrationData
      );

      // Registration successful
      if (event.type === 'Merchandise') {
        alert(` Order placed successfully!\nTicket ID: ${response.data.ticketId}\n\nPlease upload your payment proof to complete the order.`);
        setIsRegistered(true);
        setRegistrationStatus('PendingApproval');
        setSelectedVariants([]);
      } else if (event.fee > 0) {
        alert(` Registered successfully!\nTicket ID: ${response.data.ticketId}\n\nPlease upload your payment proof to complete registration.`);
        setIsRegistered(true);
        setRegistrationStatus('PendingApproval');
        setFormData({});
      } else {
        alert(` Registered successfully!\nTicket ID: ${response.data.ticketId}`);
        setIsRegistered(true);
        setSelectedVariants([]);
        setFormData({});
        setTimeout(() => navigate('/my-events'), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleProofFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum 5MB allowed.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPaymentProof(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async () => {
    if (!paymentProof) {
      setError('Please select a payment proof image');
      return;
    }
    try {
      setUploadingProof(true);
      setError('');
      await api.put(`/events/${eventId}/upload-proof`, { proofImage: paymentProof });
      alert('Payment proof uploaded successfully! The organizer will review your order.');
      setProofUploaded(true);
      setTimeout(() => navigate('/my-events'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload proof');
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) {
    return <div className="event-details-container loading">Loading event details...</div>;
  }

  if (!event) {
    return (
      <div className="event-details-container error">
        <p>{error || 'Event not found'}</p>
        <button onClick={() => navigate('/browse-events')} className="back-button">
          Back to Events
        </button>
      </div>
    );
  }

  const isPastDeadline = event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const isFull = event.participantLimit && event.registrationCount >= event.participantLimit;

  return (
    <div className="event-details-container">
      {/* Header Image/Banner */}
      <div className="event-banner" style={{
        background: '#667eea'
      }}>
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <h1>{event.name}</h1>
          <p className="event-type">{event.type === 'Normal' ? ' Normal Event' : ' Merchandise Event'}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="event-details-content">
        <div className="main-section">
          {/* Event Information */}
          <div className="info-card">
            <h2>Event Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label"> Start Date</span>
                <span className="value">{new Date(event.startDate).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="label"> End Date</span>
                <span className="value">{new Date(event.endDate).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="label"> Location</span>
                <span className="value">{event.location}</span>
              </div>
              <div className="info-item">
                <span className="label"> Entry Fee</span>
                <span className="value">₹{event.fee || 'Free'}</span>
              </div>
              <div className="info-item">
                <span className="label"> Capacity</span>
                <span className="value">{event.registrationCount || 0} / {event.participantLimit || '∞'}</span>
              </div>
              <div className="info-item">
                <span className="label"> Eligibility</span>
                <span className="value">{event.eligibility?.type || 'Everyone'}</span>
              </div>
            </div>

            {/* Registration Deadline */}
            {event.registrationDeadline && (
              <div className="deadline-info">
                <span className="label"> Registration Closes:</span>
                <span className="value">{new Date(event.registrationDeadline).toLocaleString()}</span>
                {isPastDeadline && <span className="expired-badge">Registration Closed</span>}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="info-card">
            <h2>Description</h2>
            <p className="event-description">{event.description}</p>
          </div>

          {/* Custom Form Fields (for Normal Events) */}
          {event.type === 'Normal' && event.customForm && event.customForm.length > 0 && (
            <div className="info-card">
              <h2>Registration Form</h2>
              <form className="registration-form">
                {event.customForm.map(field => (
                  <div key={field.fieldId} className="form-group">
                    <label>{field.label}{field.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                    {(field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date') && (
                      <input
                        type={field.fieldType}
                        placeholder={field.placeholder}
                        value={formData[field.fieldId] || ''}
                        onChange={(e) => handleFormChange(field.fieldId, e.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === 'email' && (
                      <input
                        type="email"
                        placeholder={field.placeholder}
                        value={formData[field.fieldId] || ''}
                        onChange={(e) => handleFormChange(field.fieldId, e.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === 'phone' && (
                      <input
                        type="tel"
                        placeholder={field.placeholder}
                        value={formData[field.fieldId] || ''}
                        onChange={(e) => handleFormChange(field.fieldId, e.target.value)}
                        required={field.required}
                      />
                    )}
                    {field.fieldType === 'select' && (
                      <select
                        value={formData[field.fieldId] || ''}
                        onChange={(e) => handleFormChange(field.fieldId, e.target.value)}
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options && field.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {field.fieldType === 'checkbox' && (
                      <label className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={!!formData[field.fieldId]}
                          onChange={(e) => handleFormChange(field.fieldId, e.target.checked)}
                        />
                        {field.placeholder || field.label}
                      </label>
                    )}
                    {field.fieldType === 'textarea' && (
                      <textarea
                        placeholder={field.placeholder}
                        value={formData[field.fieldId] || ''}
                        onChange={(e) => handleFormChange(field.fieldId, e.target.value)}
                        required={field.required}
                        rows="4"
                      />
                    )}
                  </div>
                ))}
              </form>
            </div>
          )}

          {/* Merchandise Variants (for Merchandise Events) */}
          {event.type === 'Merchandise' && event.merchandise?.variants?.length > 0 && (
            <div className="info-card">
              <h2>Select Variants</h2>
              {event.merchandise.purchaseLimit && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  You can select up to <strong>{event.merchandise.purchaseLimit}</strong> variant(s) per order.
                </p>
              )}
              {event.merchandise.description && (
                <p style={{ fontSize: '14px', marginBottom: '12px' }}>{event.merchandise.description}</p>
              )}
              <div className="variants-grid">
                {event.merchandise.variants.map(variant => {
                  const outOfStock = variant.stock <= 0;
                  return (
                  <div 
                    key={variant.variantId} 
                    className={`variant-card ${selectedVariants.includes(variant.variantId) ? 'selected' : ''} ${outOfStock ? 'out-of-stock-card' : ''}`}
                    onClick={() => handleVariantSelection(variant.variantId)}
                    style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <div className="variant-header">
                      <h3>{variant.name}</h3>
                      <span className="price">₹{variant.price}</span>
                    </div>
                    {variant.size && <p className="variant-detail">Size: {variant.size}</p>}
                    {variant.color && <p className="variant-detail">Color: {variant.color}</p>}
                    <div className="stock-info">
                      <span className={outOfStock ? 'out-of-stock' : 'in-stock'}>
                        {outOfStock ? 'Out of stock' : `${variant.stock} in stock`}
                      </span>
                    </div>
                    {selectedVariants.includes(variant.variantId) && <span className="checkmark"></span>}
                  </div>
                  );
                })}
              </div>
              {selectedVariants.length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(102,126,234,0.08)', borderRadius: '8px' }}>
                  <strong>Order Summary:</strong>{' '}
                  {selectedVariants.map(vid => {
                    const v = event.merchandise.variants.find(x => x.variantId === vid);
                    return v ? v.name : vid;
                  }).join(', ')}{' '}
                  — Total: ₹{selectedVariants.reduce((sum, vid) => {
                    const v = event.merchandise.variants.find(x => x.variantId === vid);
                    return sum + (v ? v.price : 0);
                  }, 0)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Organizer Section */}
        <div className="sidebar">
          <div className="organizer-card">
            <h3>Organized By</h3>
            <div className="organizer-info">
              <p className="club-name">{event.organizer?.clubName || 'Event Organizer'}</p>
              <p className="contact-email">
                <a href={`mailto:${event.organizer?.email}`}>
                   {event.organizer?.email}
                </a>
              </p>
            </div>
          </div>

          {/* Registration Status */}
          {isRegistered && (
            <div className="status-card registered">
              <p className="status-icon"></p>
              <p className="status-text">
                {registrationStatus === 'PendingApproval' ? 'Order placed — pending approval' : 'You are already registered'}
              </p>
              <button 
                onClick={() => navigate('/my-events')}
                className="view-ticket-btn"
              >
                View Your Ticket
              </button>
            </div>
          )}

          {/* Payment Proof Upload for Merchandise or Paid Events */}
          {isRegistered && (event.type === 'Merchandise' || event.fee > 0) && registrationStatus === 'PendingApproval' && !proofUploaded && (
            <div className="info-card" style={{ marginTop: '16px', padding: '16px' }}>
              <h3> Upload Payment Proof</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Upload a screenshot of your payment to complete the order. The organizer will review and approve it.
              </p>
              <input type="file" accept="image/*" onChange={handleProofFileSelect} style={{ marginBottom: '8px' }} />
              {paymentProof && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={paymentProof} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                </div>
              )}
              <button
                className="register-btn"
                onClick={handleUploadProof}
                disabled={uploadingProof || !paymentProof}
                style={{ width: '100%' }}
              >
                {uploadingProof ? 'Uploading...' : ' Upload Proof'}
              </button>
            </div>
          )}
          {isRegistered && (event.type === 'Merchandise' || event.fee > 0) && proofUploaded && registrationStatus === 'PendingApproval' && (
            <div className="info-card" style={{ marginTop: '16px', padding: '16px', background: 'rgba(16,185,129,0.1)' }}>
              <p style={{ textAlign: 'center' }}> Payment proof uploaded. Awaiting organizer approval.</p>
            </div>
          )}

          {/* Registration Button */}
          <div className="registration-card">
            {error && <p className="error-message">{error}</p>}
            
            <button
              className={`register-btn ${isRegistered || isPastDeadline || isFull || registering ? 'disabled' : ''}`}
              onClick={handleRegister}
              disabled={isRegistered || isPastDeadline || isFull || registering}
            >
              {registering && 'Processing...'}
              {!registering && isRegistered && 'Already Registered'}
              {!registering && isPastDeadline && 'Registration Closed'}
              {!registering && isFull && 'Event Full'}
              {!registering && !isRegistered && !isPastDeadline && !isFull && (
                event.type === 'Merchandise' 
                  ? `Place Order${selectedVariants.length > 0 ? ` (${selectedVariants.length} items)` : ''}`
                  : 'Register Now'
              )}
            </button>

            {/* Additional Info */}
            <div className="register-info">
              {event.fee > 0 && <p> Fee: ₹{event.fee}</p>}
              {event.hasTeamRegistration && <p> Team Registration Available</p>}
            </div>
          </div>

          {/* Discussion Forum Link */}
          {localStorage.getItem('token') && (
            <div className="info-card" style={{ marginTop: '16px' }}>
              <Link to={`/event/${eventId}/forum`} className="register-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                 Discussion Forum
              </Link>
            </div>
          )}

          {/* Team Registration Link */}
          {event.isTeamEvent && localStorage.getItem('token') && (
            <div className="info-card" style={{ marginTop: '16px' }}>
              <Link to={`/event/${eventId}/team`} className="register-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                 Team Registration
              </Link>
            </div>
          )}

          {/* Back Button */}
          <button 
            onClick={() => navigate('/browse-events')}
            className="back-link"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
