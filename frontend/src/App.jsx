import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/Navigation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import BrowseEvents from './pages/BrowseEvents';
import MyEventsDashboard from './pages/MyEventsDashboard';
import EventDetails from './pages/EventDetails';
import ClubsListing from './pages/ClubsListing';
import ClubDetail from './pages/ClubDetail';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEvents from './pages/OrganizerEvents';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrganizers from './pages/AdminOrganizers';
import AdminPasswordResets from './pages/AdminPasswordResets';
import TeamRegistration from './pages/TeamRegistration';
import MerchandiseOrders from './pages/MerchandiseOrders';
import DiscussionForum from './pages/DiscussionForum';
import OrganizerPasswordReset from './pages/OrganizerPasswordReset';
import ProtectedRoute from './components/ProtectedRoute';

function HomeRedirect() {
 const token = localStorage.getItem('token');
 const role = localStorage.getItem('role');
 if (token) {
 if (role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
 if (role === 'Organizer') return <Navigate to="/organizer/dashboard" replace />;
 return <Navigate to="/dashboard" replace />;
 }
 return <Navigate to="/login" replace />;
}

function App() {
return ( <BrowserRouter>
 <Navigation />
 <Routes>

 {/* Public routes */}
 <Route path="/login" element={<Login />} />
 <Route path="/signup" element={<Signup />} />
 <Route path="/onboarding" element={<Onboarding />} />
 <Route path="/browse-events" element={<BrowseEvents />} />
 <Route path="/event/:eventId" element={<EventDetails />} />
 <Route path="/clubs" element={<ClubsListing />} />
 <Route path="/clubs/:organizerId" element={<ClubDetail />} />
 <Route path="/organizer-password-reset" element={<OrganizerPasswordReset />} />

 {/* Participant routes */}
 <Route
 path="/dashboard"
 element={
 <ProtectedRoute allowedRoles={['Participant']}>
 <Dashboard />
 </ProtectedRoute>
 }
 />
 <Route
 path="/profile"
 element={
 <ProtectedRoute allowedRoles={['Participant', 'Organizer']}>
 <Profile />
 </ProtectedRoute>
 }
 />
 <Route
 path="/my-events"
 element={
 <ProtectedRoute allowedRoles={['Participant']}>
 <MyEventsDashboard />
 </ProtectedRoute>
 }
 />

 {/* Organizer routes */}
 <Route
 path="/organizer/dashboard"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <OrganizerDashboard />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/events"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <OrganizerEvents />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/events/:eventId"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <OrganizerEventDetail />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/events/:eventId/edit"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <EditEvent />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/create-event"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <CreateEvent />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/profile"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <Profile />
 </ProtectedRoute>
 }
 />
 <Route
 path="/organizer/events/:eventId/orders"
 element={
 <ProtectedRoute allowedRoles={['Organizer']}>
 <MerchandiseOrders />
 </ProtectedRoute>
 }
 />

 {/* Team routes (Tier A) */}
 <Route
 path="/event/:eventId/team"
 element={
 <ProtectedRoute allowedRoles={['Participant']}>
 <TeamRegistration />
 </ProtectedRoute>
 }
 />

 {/* Discussion Forum (Tier B) */}
 <Route
 path="/event/:eventId/forum"
 element={
 <ProtectedRoute>
 <DiscussionForum />
 </ProtectedRoute>
 }
 />

 {/* Admin routes */}
 <Route
 path="/admin/dashboard"
 element={
 <ProtectedRoute allowedRoles={['Admin']}>
 <AdminDashboard />
 </ProtectedRoute>
 }
 />
 <Route
 path="/admin/organizers"
 element={
 <ProtectedRoute allowedRoles={['Admin']}>
 <AdminOrganizers />
 </ProtectedRoute>
 }
 />
 <Route
 path="/admin/password-resets"
 element={
 <ProtectedRoute allowedRoles={['Admin']}>
 <AdminPasswordResets />
 </ProtectedRoute>
 }
 />

 {/* Default route */}
 <Route path="/" element={<HomeRedirect />} />
 <Route path="*" element={<HomeRedirect />} />

 </Routes>
</BrowserRouter>

);
}

export default App;
