# Campus Grievance Redressal System — Backend

REST API server for the Campus Complaint and Grievance Redressal System. Built with Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer (disk storage) |
| Scheduled jobs | node-cron |
| Tests | Jest + Supertest |

---

## Prerequisites

- Node.js v18+
- MongoDB 6+ running locally or accessible via URI

---

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in your values
npm run seed           # create demo users, categories, ~25 complaints
npm run dev            # start dev server with nodemon
```

---

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | 5000 | HTTP port |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string (dev DB) |
| `MONGODB_URI_TEST` | **Yes** | — | Separate test DB (never touched in prod) |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | 7d | JWT expiry |
| `CLIENT_URL` | No | http://localhost:5173 | Allowed CORS origin |
| `ALLOWED_EMAIL_DOMAIN` | No | *(empty = any)* | Restrict registration to one domain |
| `AUTO_CLOSE_DAYS` | No | 7 | Days after Resolved before auto-close |
| `UPLOAD_DIR` | No | uploads | Directory for uploaded attachments |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm test` | Run Jest + Supertest suite (uses `MONGODB_URI_TEST`) |
| `npm run seed` | Upsert demo data (safe to re-run) |
| `npm run seed -- --reset` | Wipe all collections, then reseed from scratch |

---

## Demo Accounts

All passwords: **Password@123**

| Role | Email | Department |
|---|---|---|
| admin | admin@campus.edu | — |
| officer | officer.hostel@campus.edu | Hostel Administration |
| officer | officer.academic@campus.edu | Academic Section |
| officer | officer.it@campus.edu | Computer Centre |
| student | student1@campus.edu | — |
| student | student2@campus.edu | — |
| staff | staff1@campus.edu | — |

---

## Folder Structure

```
server/
├── scripts/
│   ├── seed.js                   Idempotent demo data seeder
│   ├── smoke-auth.js             Auth smoke test (requires server running)
│   ├── smoke-complaints.js       Complaint smoke test
│   ├── smoke-workflow.js         Workflow lifecycle smoke test
│   ├── smoke-comments-analytics.js  Comments + analytics smoke test
│   └── verify-models.js          Mongoose schema sanity check
├── src/
│   ├── app.js                    Express app (no listen; exported for tests)
│   ├── server.js                 DB connect → cron start → listen
│   ├── constants.js              Roles, statuses, priorities, transitions
│   ├── config/
│   │   ├── env.js                Env validation + config object
│   │   └── db.js                 Mongoose connect helper
│   ├── models/                   Mongoose schemas
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Complaint.js          Includes isOverdue virtual + createWithCode static
│   │   ├── StatusLog.js
│   │   ├── Comment.js
│   │   ├── Feedback.js
│   │   └── Counter.js            Atomic sequence for complaint codes
│   ├── middleware/
│   │   ├── auth.js               authenticate + authorize(roles)
│   │   ├── upload.js             Multer config (type/size guards)
│   │   ├── sanitize.js           Strip $ and . keys (NoSQL injection guard)
│   │   ├── errorHandler.js       Global error → JSON envelope
│   │   └── notFound.js           404 catch-all
│   ├── services/                 Business logic (never bypassed by controllers)
│   │   ├── authService.js
│   │   ├── categoryService.js
│   │   ├── userService.js
│   │   ├── complaintService.js   + assertCanView, anonymous masking
│   │   ├── workflowService.js    + getAllowedActions, atomic transitions
│   │   ├── commentService.js     + internal-note filter, anon masking
│   │   ├── analyticsService.js   + concurrent aggregations, gap-fill
│   │   ├── codeGenerator.js      Atomic GRV-YYYY-NNNN counter
│   ├── controllers/              Thin HTTP handlers
│   ├── routes/                   Express routers
│   ├── validators/               Hand-written validation functions
│   ├── jobs/
│   │   └── autoClose.js          Hourly cron: auto-close stale Resolved complaints
│   └── utils/
│       ├── ApiError.js           HTTP error class
│       ├── asyncHandler.js       Async try/catch wrapper
│       ├── response.js           sendSuccess / sendError envelope helpers
│       ├── logger.js             Console wrapper with levels
│       ├── pagination.js         Parse page/limit, build meta
│       ├── validate.js           isNonEmptyString, hasLength, isEmail… + validateBody
│       └── escapeRegex.js        Escape special chars for regex search
├── tests/
│   ├── setup.js                  Connect/disconnect test DB
│   └── api.test.js               49 tests: TC-01..TC-08 + extended coverage
├── uploads/                      Attachment storage (gitignored)
├── .env.example
└── package.json
```

---

## API Overview

Base path: `/api`. Full documentation in [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | Public | Server + DB health check |
| POST | /api/auth/register | Public | Register student or staff |
| POST | /api/auth/login | Public | Login, get JWT |
| GET | /api/auth/me | Bearer JWT | Current user |
| PATCH | /api/auth/me | Bearer JWT | Update name/department |
| POST | /api/auth/change-password | Bearer JWT | Change password |
| GET | /api/categories | Bearer JWT | List active categories |
| POST | /api/categories | admin | Create category |
| PATCH | /api/categories/:id | admin | Update category |
| DELETE | /api/categories/:id | admin | Soft-delete category |
| GET | /api/users | admin | List users (paginated) |
| POST | /api/users | admin | Create any-role user |
| PATCH | /api/users/:id | admin | Update user |
| GET | /api/users/officers | officer, admin | Officers dropdown |
| POST | /api/complaints | student, staff | File complaint (multipart) |
| GET | /api/complaints | Bearer JWT | List (role-scoped) |
| GET | /api/complaints/:id | Bearer JWT | Full detail |
| GET | /api/complaints/:id/attachments/:file | Bearer JWT | Stream attachment |
| PATCH | /api/complaints/:id/assign | officer, admin | Assign/reassign |
| PATCH | /api/complaints/:id/status | officer, admin | Advance status |
| POST | /api/complaints/:id/verify | owner | Resolved → Closed |
| POST | /api/complaints/:id/reopen | owner | Resolved → In Progress |
| POST | /api/complaints/:id/feedback | owner | Rate after Close |
| GET | /api/complaints/:id/comments | Bearer JWT | List comments |
| POST | /api/complaints/:id/comments | Bearer JWT | Post comment |
| GET | /api/analytics/summary | admin | Global analytics |
| GET | /api/analytics/my-summary | Bearer JWT | Role-aware personal stats |

### Response envelope

```json
{ "success": true, "data": { ... } }
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

---

## Security

- JWT in `Authorization: Bearer <token>` header only
- Passwords hashed with bcryptjs (cost 10); hash never returned in responses
- Rate limit on `/register` and `/login`: 20 requests / 15 min / IP
- `sanitize` middleware strips `$` and `.` keys from body/query (NoSQL injection prevention)
- `helmet` sets secure HTTP headers
- CORS restricted to `CLIENT_URL`
- `express.json` body limit: 1 MB
- Attachment streaming only through authenticated, access-checked routes
- `NODE_ENV=test`-gated debug endpoints (backdating) never run in production

---

## Complaint Code Format

`GRV-YYYY-NNNN` — atomic counter per year (e.g. `GRV-2026-0001`).
Generated using `Counter.findOneAndUpdate` with `$inc` + `upsert` — race-safe.

## Status Lifecycle

```
Submitted → Acknowledged (via assignment only)
Acknowledged → In Progress (assigned officer / admin)
In Progress → Resolved (assigned officer / admin; resolutionNotes required)
Resolved → Closed (complainant verifies, or system auto-closes after AUTO_CLOSE_DAYS)
Resolved → In Progress (complainant reopens; reason required; reopenCount++)
Closed is terminal.
```

All transitions enforced in `workflowService.js` using atomic `findOneAndUpdate` (concurrent-safe).
