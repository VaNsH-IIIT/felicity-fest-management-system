import { useNavigate, Link } from 'react-router-dom';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1> Dashboard</h1>
        <p className="welcome">You are logged in </p>

        <div className="dashboard-grid">
          <Link to="/browse-events" className="dashboard-card">
            <div className="card-icon"></div>
            <h3>Browse Events</h3>
            <p>Discover and register for events</p>
          </Link>

          <Link to="/my-events" className="dashboard-card">
            <div className="card-icon"></div>
            <h3>My Events</h3>
            <p>View your registrations and tickets</p>
          </Link>

          <Link to="/clubs" className="dashboard-card">
            <div className="card-icon"></div>
            <h3>Clubs</h3>
            <p>Browse and follow clubs</p>
          </Link>

          <Link to="/profile" className="dashboard-card">
            <div className="card-icon"></div>
            <h3>My Profile</h3>
            <p>View your interests and preferences</p>
          </Link>
        </div>

        <div className="dashboard-actions">
          <button onClick={logout} className="logout-btn">
             Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
