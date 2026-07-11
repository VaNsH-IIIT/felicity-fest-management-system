import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/MyEventsDashboard.css';

function TicketModal({ registration, onClose }) {
  if (!registration) return null;
  const [qrCode, setQrCode] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    if (registration?.ticketId) {
      setLoadingQR(true);
      api.get(`/events/ticket/${registration.ticketId}`)
        .then(res => setQrCode(res.data.qrCode))
        .catch(() => {})
        .finally(() => setLoadingQR(false));
    }
  }, [registration?.ticketId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}></button>

        <div className="ticket-content">
          <div className="ticket-header">
            <h2> Event Ticket</h2>
            <span className="ticket-id">{registration.ticketId}</span>
          </div>

          {/* QR Code */}
          <div className="qr-section">
            {loadingQR ? (
              <p>Loading QR code...</p>
            ) : qrCode ? (
              <img src={qrCode} alt="Ticket QR Code" className="qr-code-img" />
            ) : (
              <p className="qr-placeholder">QR code unavailable</p>
            )}
          </div>

          {registration.event && (
            <div className="ticket-details">
              <div className="detail-row">
                <strong>Event:</strong>
                <span>{registration.event.name}</span>
              </div>
              <div className="detail-row">
                <strong>Type:</strong>
                <span>{registration.event.type}</span>
              </div>
              <div className="detail-row">
                <strong>Date:</strong>
                <span>{new Date(registration.event.startDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <strong>Location:</strong>
                <span>{registration.event.location || 'TBA'}</span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status status-${registration.status.toLowerCase()}`}>
                  {registration.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Payment Status:</strong>
                <span className={`payment payment-${registration.paymentStatus.toLowerCase()}`}>
                  {registration.paymentStatus}
                </span>
              </div>

              {registration.event.type === 'Normal' && registration.formResponses && (
                <div className="form-responses">
                  <h3>Your Responses</h3>
                  {Object.entries(registration.formResponses).map(([key, value]) => (
                    <div key={key} className="response-item">
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              )}

              {registration.event.type === 'Merchandise' && registration.merchandisePurchase && (
                <div className="merchandise-details">
                  <h3>Merchandise Purchase</h3>
                  <div className="purchase-items">
                    {registration.merchandisePurchase.items?.map((item, idx) => (
                      <div key={idx} className="purchase-item">
                        <span>{item.variantName} x{item.quantity}</span>
                        <span>₹{item.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="purchase-total">
                    <strong>Total: ₹{registration.merchandisePurchase.totalAmount}</strong>
                  </div>
                  <div className="detail-row">
                    <strong>Delivery Status:</strong>
                    <span>{registration.merchandisePurchase.deliveryStatus}</span>
                  </div>
                </div>
              )}

              {registration.checkedIn && (
                <div className="checkin-info">
                  <strong> Checked in at:</strong>
                  <span>{new Date(registration.checkInTime).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={handlePrint} className="print-btn">
             Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

function MyEventsDashboard() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [uploadingProofFor, setUploadingProofFor] = useState(null);
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/my-events?tab=${activeTab}`);
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching events:', err);
      alert('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (eventId) => {
    if (!proofFile) {
      alert('Please select a payment proof image');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await api.put(`/events/${eventId}/upload-proof`, { proofImage: reader.result });
          alert('Payment proof uploaded! The organizer will review your order.');
          setUploadingProofFor(null);
          setProofFile(null);
          fetchEvents();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to upload proof');
        }
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      alert('Failed to process image');
    }
  };

  const tabs = [
    { id: 'upcoming', label: ' Upcoming', icon: '' },
    { id: 'normal', label: ' Normal Events', icon: '' },
    { id: 'merchandise', label: ' Merchandise', icon: '' },
    { id: 'completed', label: ' Completed', icon: '' },
    { id: 'cancelled', label: ' Cancelled', icon: '' }
  ];

  return (
    <div className="my-events-container">
      <h1> My Events Dashboard</h1>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="events-container">
        {loading ? (
          <p className="loading">Loading your events...</p>
        ) : events.length > 0 ? (
          <div className="events-grid">
            {events.map(reg => (
              <div key={reg._id} className="event-card">
                {reg.event?.poster && (
                  <img src={reg.event.poster} alt={reg.event.name} className="event-image" />
                )}

                <div className="event-info">
                  <h3>{reg.event?.name}</h3>
                  <div className="event-meta">
                    <span className="event-type">
                      {reg.event?.type === 'Normal' ? '' : ''} {reg.event?.type}
                    </span>
                    <span className="event-date">
                       {new Date(reg.event?.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="event-meta">
                    <span className="organizer-name">
                       {reg.event?.organizer?.clubName || 'Unknown Organizer'}
                    </span>
                  </div>

                  <div className="status-badges">
                    <span className={`status-badge status-${reg.status.toLowerCase()}`}>
                      {reg.status}
                    </span>
                    <span className={`payment-badge payment-${reg.paymentStatus.toLowerCase()}`}>
                      {reg.paymentStatus === 'Completed' ? ' Paid' : ' ' + reg.paymentStatus}
                    </span>
                  </div>

                  {reg.teamName && (
                    <div className="team-info">
                      <span> Team: {reg.teamName}</span>
                    </div>
                  )}

                  {reg.merchandisePurchase && (
                    <div className="merchandise-summary">
                      <p>
                         {reg.merchandisePurchase.items?.length || 0} items
                        • ₹{reg.merchandisePurchase.totalAmount}
                      </p>
                      <p className="delivery-status">
                         {reg.merchandisePurchase.deliveryStatus}
                      </p>
                    </div>
                  )}

                  {reg.checkedIn && (
                    <p className="checked-in"> Checked in</p>
                  )}

                  {/* Payment Proof Upload for Pending Orders (Merch or Paid Normal) */}
                  {(reg.event?.type === 'Merchandise' || reg.event?.fee > 0) && reg.paymentStatus === 'PendingApproval' && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                      {reg.paymentProofUploaded ? (
                        <p style={{ fontSize: '12px', textAlign: 'center', color: '#10b981' }}> Proof uploaded — awaiting organizer approval</p>
                      ) : uploadingProofFor === reg._id ? (
                        <div>
                          <p style={{ fontSize: '12px', marginBottom: '6px' }}> Select payment screenshot:</p>
                          <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files[0])} style={{ fontSize: '12px', marginBottom: '6px' }} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleProofUpload(reg.event._id)} className="details-btn" style={{ fontSize: '12px', padding: '4px 10px' }}>
                               Upload
                            </button>
                            <button onClick={() => { setUploadingProofFor(null); setProofFile(null); }} style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setUploadingProofFor(reg._id)} className="details-btn" style={{ fontSize: '12px', width: '100%' }}>
                           Upload Payment Proof
                        </button>
                      )}
                    </div>
                  )}

                  <div className="ticket-section">
                    <p className="ticket-id-label">Ticket ID:</p>
                    <button
                      onClick={() => setSelectedTicket(reg)}
                      className="view-ticket-btn"
                      title={reg.ticketId}
                    >
                      {reg.ticketId.substring(0, 20)}...
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedTicket(reg)}
                    className="details-btn"
                  >
                    View Full Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No events in this category</p>
            <p className="subtext">
              {activeTab === 'upcoming'
                ? 'Check out the Browse Events page to register for events!'
                : 'You haven\'t completed any events yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      <TicketModal registration={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  );
}

export default MyEventsDashboard;
