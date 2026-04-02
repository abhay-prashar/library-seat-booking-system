# 📚 Library Seat Booking System

A production-ready library seat booking system with real-time availability, JWT authentication, role-based access control, and automatic booking lifecycle management.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | JWT (RS256) |
| Scheduling | node-cron |

---

## 🗂️ Project Structure

```
library-seat-booking-system/
├── server/
│   ├── src/
│   │   ├── config/         # DB, Socket.io setup
│   │   ├── middleware/      # Auth (JWT), error handler
│   │   ├── models/          # User, Seat, Section, Booking
│   │   ├── routes/          # auth, seats, bookings, admin
│   │   ├── services/        # bookingService.js (core logic)
│   │   ├── jobs/            # bookingJobs.js (cron)
│   │   ├── utils/           # logger, seed
│   │   ├── app.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
└── client/
    ├── src/
    │   ├── context/         # AuthContext, SocketContext
    │   ├── layouts/         # StudentLayout, AdminLayout
    │   ├── pages/
    │   │   ├── student/     # SeatsPage, MyBookingsPage
    │   │   └── admin/       # Dashboard, Bookings, Seats, Users
    │   ├── services/        # api.js (Axios)
    │   ├── App.jsx
    │   └── main.jsx
    └── vite.config.js
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas URI)

### 1. Clone & Install

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env and set MONGO_URI and JWT_SECRET
```

### 3. Seed the Database

```bash
cd server
npm run seed
```

This creates:
- **Admin**: `admin@library.edu` / `Admin@1234`
- **Student**: `student@library.edu` / `Student@1234`
- 4 sections + 40 seats

### 4. Start the Application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

---

## 🔌 API Reference

### Auth
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |

### Seats
| Method | Route | Access |
|---|---|---|
| GET | `/api/seats?sectionId=&startTime=&endTime=` | Any |
| GET | `/api/seats/sections` | Any |
| POST | `/api/seats` | Admin |
| PUT | `/api/seats/:id` | Admin |
| DELETE | `/api/seats/:id` | Admin |

### Bookings
| Method | Route | Access |
|---|---|---|
| POST | `/api/bookings` | Student |
| GET | `/api/bookings/my` | Student |
| GET | `/api/bookings/active` | Student |
| POST | `/api/bookings/:id/checkin` | Student |
| DELETE | `/api/bookings/:id` | Student/Admin |

### Admin
| Method | Route | Access |
|---|---|---|
| GET | `/api/admin/bookings` | Admin |
| GET | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/:id/block` | Admin |
| GET | `/api/admin/analytics` | Admin |

---

## 🔒 Concurrency Safety

Double booking is prevented via **two layers**:

1. **Atomic seat lock** — `findOneAndUpdate` with `isAvailable: true` condition atomically flips the seat to unavailable before the overlap check. If two concurrent requests race, only one wins.

2. **Overlap query** — Even after the atomic lock, an overlap query confirms no existing active booking covers the same time window.

Both operations run inside a **MongoDB multi-document transaction** with `writeConcern: majority`, ensuring all writes are durable.

---

## ⏱️ Booking Lifecycle

```
booked → active → [auto-expire at endTime] → expired
                → [no check-in by deadline] → no_show
                → [user/admin cancel]        → cancelled
```

- Cron job runs every minute
- No-show grace period: **15 minutes** (configurable via `CHECKIN_GRACE_PERIOD_MINUTES`)

---

## 🌐 WebSocket Events

Connect via Socket.io with `auth: { token }`.

| Event | Direction | Payload |
|---|---|---|
| `seat_update` | Server → Client | `{ type, seatId, seat? }` |

**Types:** `BOOKED`, `AVAILABLE`, `UPDATED`
