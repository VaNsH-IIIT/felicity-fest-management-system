# Fest Event Management System

A platform for running college fest events end-to-end — browsing and registering for events, buying merchandise, coordinating teams, and managing everything from the organizer/admin side. Think of it as the backend brain + frontend face for something like Felicity.

**Live demo:** https://fest-event-management-system.vercel.app
**API:** https://fest-event-management-system.onrender.com/api

---

## What it does

- **Participants** can browse events, register (solo or as a team), buy merchandise, upload payment proofs, get QR-coded tickets via email, and chat in event-specific forums.
- **Organizers** can create and manage events, review payment approvals, track registrations and analytics, and get Discord webhook notifications.
- **Admins** can oversee everything — manage organizer accounts, handle password resets, and view platform-wide stats.

---

## Tech stack

| Layer | What | Why |
|-------|------|-----|
| Frontend | React 19 + Vite 7 | Fast dev experience with HMR, modern ESM builds |
| Backend | Express 5 + Node.js | Minimal boilerplate REST API with native async error handling |
| Database | MongoDB + Mongoose 9 | Flexible schemas for events with wildly different structures |
| Auth | JWT + bcrypt | Stateless tokens + secure password hashing |
| Real-time | Socket.io | WebSocket-powered discussion forums with room-based messaging |
| Email | Resend (HTTP API) | Reliable email delivery that works on platforms like Render where SMTP ports are blocked |
| QR Codes | qrcode (npm) | Generates ticket QR codes as data URLs and PNGs |
| CAPTCHA | Google reCAPTCHA v2 | Keeps bots off login/signup forms |
| Styling | Custom dark-theme CSS | Hand-rolled with CSS custom properties — no UI framework lock-in |

---

## Key features

### Team Registration
Team-based events (hackathons, quizzes, etc.) have a full lifecycle: a leader creates a team and gets an invite code, members join with that code, and once the team is full the leader registers everyone at once. Each member gets their own QR ticket. For paid events, every member uploads payment proof individually.

### Merchandise + Payment Approval
Participants can order merch (t-shirts with size/color variants, etc.) or register for paid events. Orders start in a "pending approval" state — no stock is decremented and no ticket is issued until the organizer reviews the payment proof and approves. Rejection sends the participant back with a reason. Stock only decreases on approval, so there's no phantom inventory problem.

### Real-Time Discussion Forum
Every event gets its own chat room. Messages are sent over REST (so auth is enforced) but delivered instantly via Socket.io. Supports paginated history and shows user roles (participant/organizer/admin) next to each message.

### Organizer Password Reset
Since organizer accounts are created by admins (no self-signup), password resets go through the admin too. The organizer submits a request on a public page (they can't log in, after all), the admin reviews and approves/rejects it, and a new auto-generated password is shown to the admin to share.

### Bot Protection
Login and signup pages use Google reCAPTCHA v2 with server-side verification.

---

## Project structure

```
backend/
  server.js              # Express + Socket.io entry point
  config/db.js           # MongoDB connection
  controllers/           # Route handlers (auth, events, teams, organizer, admin, forum)
  middleware/             # Auth, role checks, CAPTCHA verification
  models/                # Mongoose schemas (User, Event, Registration, Team, ForumMessage, etc.)
  routes/                # Express route definitions
  utils/                 # Email service, QR generation, Discord webhooks, JWT helper
  seed/                  # Admin account seeder

frontend/
  src/
    api.js               # Axios instance with interceptors
    components/          # Navigation, ProtectedRoute
    pages/               # All page components (dashboard, events, teams, admin, etc.)
    styles/              # Per-page CSS files (dark theme)
```

---

## Running locally

### Prerequisites
- Node.js >= 18
- A MongoDB instance (Atlas or local)

### Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/fest_management
JWT_SECRET=your-secret-key
PORT=5000
FRONTEND_URL=http://localhost:5173
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

```bash
node server.js
```

### Frontend
```bash
cd frontend
npm install
```

Optionally create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

```bash
npx vite
```

### Default admin account
Seeded on first server start:
- **Email:** `admin@example.com`
- **Password:** `supersecurepassword`

Once running: frontend at http://localhost:5173, API at http://localhost:5000/api.