import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../styles/Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const closeMenu = () => setMobileMenuOpen(false);

  const renderParticipantLinks = () => (
    <>
      <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={closeMenu}> Dashboard</Link>
      <Link to="/browse-events" className={`nav-link ${isActive('/browse-events') ? 'active' : ''}`} onClick={closeMenu}> Browse Events</Link>
      <Link to="/clubs" className={`nav-link ${isActive('/clubs') ? 'active' : ''}`} onClick={closeMenu}> Clubs</Link>
      <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`} onClick={closeMenu}> Profile</Link>
      <button onClick={handleLogout} className="nav-link logout-btn"> Logout</button>
    </>
  );

  const renderOrganizerLinks = () => (
    <>
      <Link to="/organizer/dashboard" className={`nav-link ${isActive('/organizer/dashboard') ? 'active' : ''}`} onClick={closeMenu}> Dashboard</Link>
      <Link to="/organizer/create-event" className={`nav-link ${isActive('/organizer/create-event') ? 'active' : ''}`} onClick={closeMenu}> Create Event</Link>
      <Link to="/organizer/events" className={`nav-link ${isActive('/organizer/events') ? 'active' : ''}`} onClick={closeMenu}> My Events</Link>
      <Link to="/organizer/profile" className={`nav-link ${isActive('/organizer/profile') ? 'active' : ''}`} onClick={closeMenu}> Profile</Link>
      <button onClick={handleLogout} className="nav-link logout-btn"> Logout</button>
    </>
  );

  const renderAdminLinks = () => (
    <>
      <Link to="/admin/dashboard" className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`} onClick={closeMenu}> Dashboard</Link>
      <Link to="/admin/organizers" className={`nav-link ${isActive('/admin/organizers') ? 'active' : ''}`} onClick={closeMenu}> Manage Clubs</Link>
      <Link to="/admin/password-resets" className={`nav-link ${isActive('/admin/password-resets') ? 'active' : ''}`} onClick={closeMenu}> Password Resets</Link>
      <button onClick={handleLogout} className="nav-link logout-btn"> Logout</button>
    </>
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <span className="navbar-brand"> Fest Events</span>
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}></button>
        <div className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          {token ? (
            role === 'Admin' ? renderAdminLinks() :
            role === 'Organizer' ? renderOrganizerLinks() :
            renderParticipantLinks()
          ) : (
            <>
              <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`} onClick={closeMenu}> Login</Link>
              <Link to="/signup" className={`nav-link signup-link ${isActive('/signup') ? 'active' : ''}`} onClick={closeMenu}> Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
