# MechBook EL – Setup Guide

## Folder Structure
```
MechBookEL/
├── index.html       ← Login / Register page (calls backend API)
├── home.html        ← Landing page with hero, features, auth popups
├── home.js          ← JS for home.html
├── dashboard.html   ← Car owner & mechanic dashboards
├── booking.html     ← Booking form (Step 1–4)
├── search.html      ← Find a Workshop page
├── style.css        ← Shared styles for home.html
├── server.js        ← Node.js / Express backend
├── db.json          ← JSON database (auto-populated on register)
├── package.json     ← Node dependencies
└── job1.jpeg        ← Hero image
```

## How to Run

### 1. Install dependencies (once only)
```bash
npm install
```

### 2. Start the backend server
```bash
node server.js
```
Server runs at: **http://localhost:3000**

### 3. Open the app
Open **index.html** in your browser (or use Live Server in VS Code).

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js + Express
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Database:** db.json (JSON file, no MongoDB needed)
- **Data persistence:** localStorage (bookings, notifications, dashboard)

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/register | Create account |
| POST | /api/login | Login, returns JWT |
| GET  | /api/me | Get profile (requires Bearer token) |
| GET  | /api/users | List all users (dev only) |

## Notes
- `index.html` is the main auth page — it hits the real backend.
- `home.html` has its own login/register overlays that use localStorage only (for demo/offline use).
- Bookings, notifications, and dashboard data all use localStorage.
- The JWT secret is in `server.js` — for production, move it to a `.env` file.
