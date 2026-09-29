# Progress Log — Campus Grievance Redressal System

---

## 2026-09-30 | Prompt 1 — Monorepo Scaffold + Backend Foundation

### What was built
- **docs/**: `PROJECT_CONTEXT.md` (verbatim), `API_CONTRACT.md` (conventions + health endpoint), `PROGRESS.md` (this file)
- **Root**: `.gitignore`, `README.md`, `dev` branch created from `main`
- **server/package.json**: CommonJS, all allowed packages installed (express, mongoose, dotenv, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, multer, node-cron + nodemon, jest, supertest dev deps)
- **server/src/config/env.js**: dotenv loader, required-var check, config object with SLA_DAYS map
- **server/src/config/db.js**: mongoose connect helper, lifecycle event logs
- **server/src/utils/logger.js**: level-aware wrapper around console (no bare console.log)
- **server/src/utils/ApiError.js**: custom error class with statusCode + errors array
- **server/src/utils/asyncHandler.js**: try/catch wrapper for async route handlers
- **server/src/utils/response.js**: sendSuccess / sendError envelope helpers
- **server/src/utils/pagination.js**: parsePagination + buildMeta
- **server/src/utils/validate.js**: isNonEmptyString, hasLength, isEmail, isValidObjectId, isOneOf, validateBody middleware
- **server/src/middleware/notFound.js**: catches unmatched routes → 404 ApiError
- **server/src/middleware/errorHandler.js**: handles ApiError, Mongoose errors, multer errors, unknown 500s
- **server/src/app.js**: helmet, cors, express.json, GET /api/health, notFound, errorHandler
- **server/src/server.js**: connects DB then listens
- **server/.env.example** and **server/.env** (gitignored)
- Empty placeholder folders: models, controllers, routes, services, validators, jobs, scripts, tests, uploads

### Decisions
- `uploads/` gitignored at root level; a `.gitkeep` will be added later when the attachment feature is built.
- `JWT_SECRET` in the local `.env` is a 64-char hex string generated manually — the team must replace it before deploying.
- `ALLOWED_EMAIL_DOMAIN` left blank in `.env` (allow any domain) — tighten to `campus.edu` for production.
- `db.js` accepts an optional URI parameter so the test suite can pass `MONGODB_URI_TEST` without modifying `process.env`.

### Known Gaps
- No auth routes yet (next prompt).
- `nodemon` config not set — it will watch `src/` by default which is fine.
- Client scaffold not started (deferred to a later prompt per scope).

### Verification
- `npm run dev` in `/server` — server booted, `GET /api/health` returned `{ success: true, data: { status: "ok", ... } }`.
- `GET /api/nonexistent` returned `{ success: false, message: "Route not found: GET /api/nonexistent" }` with status 404.

---

## 2026-09-30 | Prompt 2 — Mongoose Models + Code Generator

### What was built
- **server/src/constants.js**: single source of truth — ROLES, COMPLAINANT_ROLES, STATUSES, PRIORITIES, STATUS_TRANSITIONS, SLA_DAYS, comment/feedback length limits, attachment constraints
- **server/src/models/Counter.js**: `{ key (unique), seq }` — drives atomic code generation
- **server/src/models/User.js**: name, email (unique/lowercase/trimmed), passwordHash (select:false), role enum, department, isActive; async pre-save validates officer has department; toJSON strips passwordHash and __v
- **server/src/models/Category.js**: name, description, department, defaultHandler (ref User), isActive
- **server/src/models/Complaint.js**: full schema with code, priority, status, isAnonymous, attachments, dueAt, reopenCount; `isOverdue` virtual; 5 compound indexes; `createWithCode()` static method
- **server/src/models/StatusLog.js**: immutable audit trail per transition; changedBy nullable (null = system)
- **server/src/models/Comment.js**: length limits imported from constants; isInternal flag
- **server/src/models/Feedback.js**: unique index on complaint enforces one-per-complaint at DB level
- **server/src/services/codeGenerator.js**: atomic `findOneAndUpdate` with `$inc + upsert`, one counter key per year, zero-padded to 4 digits; uses `returnDocument:'after'` (Mongoose 7+)
- **server/scripts/verify-models.js**: 15 checks covering all business rules; pre-run cleanup prevents stale-data false-failures

### Decisions
- Mongoose 7+ requires `async` pre-save hooks (no `next` argument); calling `next()` in an async hook throws `next is not a function`
- `returnDocument:'after'` replaces deprecated `new:true` in `findOneAndUpdate`
- `Feedback.complaint` has a `unique:true` index — duplicate feedback triggers error code 11000, caught by errorHandler as 409
- The verify script runs `initialCleanup()` before creating test data so it can be re-run idempotently

### Known Gaps
- `StatusLog`, `Comment` models have no tests yet — covered when the workflow service is added
- No seed script yet (later prompt)

### Verification
`node scripts/verify-models.js` → **15 PASS, 0 FAIL**

