import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import '../styles/Forum.css';

function DiscussionForum() {
  const { eventId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadEvent();
    loadMessages();

    // Connect to Socket.io
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true
    });

    socketRef.current.emit('joinEventForum', eventId);

    socketRef.current.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socketRef.current.emit('leaveEventForum', eventId);
      socketRef.current.disconnect();
    };
  }, [eventId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadEvent = async () => {
    try {
      const res = await api.get(`/events/details/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api.get(`/forum/${eventId}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post(`/forum/${eventId}/messages`, { text: newMessage.trim() });
      setNewMessage('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (loading) return <div className="forum-loading">Loading forum...</div>;

  return (
    <div className="forum-container">
      <div className="forum-header">
        <Link to={`/event/${eventId}`} className="back-link">← Back to Event</Link>
        <h1> Discussion Forum</h1>
        {event && <p className="forum-event-name">{event.name}</p>}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const showDate = idx === 0 ||
              formatDate(msg.createdAt) !== formatDate(messages[idx - 1].createdAt);

            return (
              <div key={msg._id || idx}>
                {showDate && (
                  <div className="date-divider">
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                )}
                <div className={`message ${msg.userRole === 'Organizer' ? 'organizer-msg' : ''}`}>
                  <div className="message-header">
                    <span className="message-author">{msg.userName}</span>
                    {msg.userRole === 'Organizer' && (
                      <span className="role-badge organizer">Organizer</span>
                    )}
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={handleSend}>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !newMessage.trim()}>
          {sending ? '...' : ' Send'}
        </button>
      </form>
    </div>
  );
}

export default DiscussionForum;
