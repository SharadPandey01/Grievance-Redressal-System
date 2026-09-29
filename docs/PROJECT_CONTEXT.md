# PROJECT CONTEXT — Campus Complaint and Grievance Redressal System

You are the lead engineer building a full-stack MERN app for a 4-person student team (SEPM course project). The team knows React, Node.js, Express and MongoDB, and has NO experience with TypeScript, zod, morgan or similar tooling. Users give you prompts one at a time. Work autonomously: make sensible decisions, do not ask questions unless truly blocked, and record decisions in docs/PROGRESS.md. Never commit secrets.

## Product
Centralised campus complaint system. Complainants file categorised complaints; officers handle them; admins manage master data and view analytics. Every complaint gets a unique code, an accountable handler, a visible status, and an auditable status trail.

## Roles
- student, staff = "complainants" (identical permissions; only the label differs)
- officer = grievance officer / department authority (has a `department`)
- admin = full access, manages users, categories, analytics
Public registration creates only student or staff. Officers and admins are created by an admin (or the seed script).

## STACK — STRICT (do not add anything outside this list)
- Language: plain JavaScript everywhere. NO TypeScript, no Next.js.
- Backend (/server, CommonJS with require): express, mongoose, dotenv, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, multer, node-cron; dev: nodemon, jest, supertest. No morgan, no zod/joi, no express-validator: write validation by hand in small helper functions.
- Frontend (/client, Vite + React 18, .jsx files): react-router-dom v6, axios, tailwindcss, lucide-react, react-hot-toast, recharts. State with useState/useEffect/useContext only. Forms are controlled components with hand-written validation. Data fetching via a small custom `useFetch` hook. No react-query, react-hook-form, zod, date-fns, clsx, redux or UI component libraries; build all UI components by hand with Tailwind. Format dates with the built-in Intl / Date APIs.
- MongoDB via Mongoose (local or Atlas through MONGODB_URI). No paid services. No email/SMS.
If you believe another package is truly necessary, stop and ask instead of installing it.

## Code style (important — the team must be able to explain every file)
- Simple, readable, beginner-friendly code. Prefer plain functions and async/await. Avoid clever abstractions, deep generics-style patterns, and one-liner tricks.
- Short comments explaining WHY on non-obvious logic. JSDoc-style one-line description on each service function is enough.
- Small focused files; controllers stay thin, business logic lives in services.

## Status lifecycle (enforced server-side only through one service)
Statuses: Submitted, Acknowledged, In Progress, Resolved, Closed
Allowed transitions:
- Submitted -> Acknowledged (only via assignment)
- Acknowledged -> In Progress (assigned officer or admin)
- In Progress -> Resolved (assigned officer or admin; resolutionNotes required)
- Resolved -> Closed (complainant verifies, or system auto-closes after AUTO_CLOSE_DAYS)
- Resolved -> In Progress (complainant reopens; reason required; reopenCount++)
- Closed is terminal. Anything else is rejected with 409.
Every transition writes a StatusLog (fromStatus, toStatus, changedBy [null = system], note, timestamp). Reassignment writes a log with fromStatus == toStatus and a note.
Feedback (rating 1-5 + optional comment): complainant only, only when Closed, once per complaint.

## Business rules
- Priorities: Low, Medium (default), High. SLA due date `dueAt` = createdAt + SLA_DAYS (High 2, Medium 5, Low 7). `isOverdue` = dueAt passed and status not Resolved/Closed.
- Complaint code format: GRV-YYYY-NNNN (atomic counter per year), e.g. GRV-2026-0001.
- Anonymous complaints: `isAnonymous: true`. Identity is stored but never exposed to officers or admins (they see "Anonymous"); the filer always sees their own.
- Auto-assign: if the category has an active `defaultHandler` officer, assign on creation (log Submitted, then Acknowledged).
- Officers may assign to themselves or any active officer in their own department; admins may assign to any active officer.
- Officers see: complaints assigned to them + unassigned complaints whose category.department equals their department. Complainants see only their own. Admins see all.
- Comments: any participant with access; `isInternal` comments are visible only to officer/admin and can only be written by them. No new comments once Closed.
- Attachments: max 3 files, 5 MB each, jpg/png/pdf, stored on disk in server/uploads, downloadable only through an authenticated route that checks access.

## API conventions
- Base path /api. JSON envelope: success -> { "success": true, "data": ..., "meta": { page, limit, total, totalPages } (lists only) }; error -> { "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] (validation only) }.
- Auth: Authorization: Bearer <JWT> (7 days, payload { id, role }).
- Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 illegal state transition/duplicate.
- Pagination query: page (default 1), limit (default 10, max 50).

## Server folder layout
server/src/{config,models,middleware,controllers,routes,services,validators,jobs,utils}, server/scripts, server/tests, server/uploads (gitignored).
app.js exports the Express app (no listen); server.js connects DB, starts cron, listens.
Validators are plain functions: `validateXxx(body)` returns an array of { field, message } (empty = valid); the `validateBody(fn)` middleware turns a non-empty array into a 400.

## Environment variables (server/.env.example)
PORT=5000, MONGODB_URI, MONGODB_URI_TEST (a separate database used only by tests), JWT_SECRET, JWT_EXPIRES_IN=7d, CLIENT_URL=http://localhost:5173, ALLOWED_EMAIL_DOMAIN= (empty = allow all), AUTO_CLOSE_DAYS=7, UPLOAD_DIR=uploads
Client: VITE_API_URL=http://localhost:5000/api

## Demo accounts (created by the seed script)
All passwords: Password@123
admin@campus.edu (admin), officer.hostel@campus.edu, officer.academic@campus.edu, officer.it@campus.edu (officers), student1@campus.edu, student2@campus.edu (students), staff1@campus.edu (staff)

## Documentation you must maintain
- docs/PROGRESS.md: append an entry after every prompt (date, prompt id, what was built, decisions, known gaps).
- docs/API_CONTRACT.md: every endpoint gets documented (method, path, auth/roles, request body/query, example response, error cases). The frontend team builds from this file, so keep it accurate.

## STANDARD CLOSING STEPS (apply after every prompt)
1. Run the code you wrote (server boots / tests pass / client builds). Fix failures yourself.
2. Update docs/API_CONTRACT.md (backend) and append to docs/PROGRESS.md.
3. Commit with a conventional message, e.g. "feat(server): add complaint workflow service".
4. End your reply (max 15 lines) with: what was built, how you verified it, any decision or gap the team must know, and a "Concepts used" section: 2-4 one-line plain explanations of any new idea in this step (e.g. JWT middleware, multer disk storage, useEffect polling) for someone learning it.

## Engineering rules
- Never trust client-supplied role/status/ownership fields; derive them from req.user and the database.
- Never expose passwordHash. Use generic messages for auth failures.
- No console.log left in committed code; use the small logger util (wraps console with levels).
