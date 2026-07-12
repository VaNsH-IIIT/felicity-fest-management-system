import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import '../styles/OrganizerPages.css';

function MerchandiseOrders() {
  const { eventId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [event, setEvent] = useState(null);

  useEffect(() => {
    loadOrders();
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}`);
      setEvent(res.data.event || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (registrationId, action, rejectionReason = '') => {
    try {
      await api.put(`/organizer/orders/${registrationId}/approve`, { action, reason: rejectionReason });
      alert(`Order ${action}d successfully!`);
      loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const handleReject = (registrationId) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // cancelled
    handleApproval(registrationId, 'reject', reason);
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.payment?.status === filter);

  if (loading) return <div className="org-loading">Loading orders...</div>;

  return (
    <div className="org-container">
      <Link to={`/organizer/events/${eventId}`} className="back-link">← Back to Event</Link>
      <h1>{event?.type === 'Merchandise' ? ' Merchandise Orders' : ' Payment Approvals'}</h1>

      <div className="filter-bar">
        {['all', 'PendingApproval', 'Completed', 'Rejected'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'PendingApproval' ? 'Pending' : f}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">No orders found.</div>
      ) : (
        <div className="events-table">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Participant</th>
                {event?.type === 'Merchandise' && <th>Items</th>}
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id}>
                  <td><code>{order.ticketId}</code></td>
                  <td>{order.participant?.email || 'N/A'}</td>
                  {event?.type === 'Merchandise' && (
                  <td>
                    {order.merchandisePurchase?.items?.map((item, i) => (
                      <div key={i} className="order-item">
                        {item.variantName} x{item.quantity}
                      </div>
                    )) || '—'}
                  </td>
                  )}
                  <td>₹{order.merchandisePurchase?.totalAmount || order.payment?.amount || 0}</td>
                  <td>
                    <span className={`status-badge ${(order.payment?.status || '').toLowerCase().replace(/\s/g, '')}`}>
                      {order.payment?.status}
                    </span>
                  </td>
                  <td>
                    {order.payment?.proofImage ? (
                      order.payment.proofImage.startsWith('data:') ? (
                        <img src={order.payment.proofImage} alt="Payment Proof" style={{ maxWidth: '80px', maxHeight: '80px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => window.open(order.payment.proofImage, '_blank')} />
                      ) : (
                        <a href={order.payment.proofImage} target="_blank" rel="noreferrer" className="proof-link">
                          View Proof
                        </a>
                      )
                    ) : <span style={{ color: '#f59e0b' }}> Awaiting</span>}
                  </td>
                  <td>
                    {order.payment?.status === 'PendingApproval' && (
                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          onClick={() => handleApproval(order._id, 'approve')}
                        >
                           Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleReject(order._id)}
                        >
                           Reject
                        </button>
                      </div>
                    )}
                    {order.payment?.status === 'Rejected' && order.payment?.rejectionReason && (
                      <small className="rejection-reason">Reason: {order.payment.rejectionReason}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MerchandiseOrders;
