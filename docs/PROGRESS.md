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

---

## 2026-09-30 | Prompt 3 — Authentication + RBAC

### What was built
- **src/validators/auth.validators.js**: `validateRegister`, `validateLogin`, `validateUpdateMe`, `validateChangePassword`; shared `isValidPassword` (min 8, ≥1 letter, ≥1 number)
- **src/middleware/auth.js**: `authenticate` (verify Bearer JWT, DB-load user, reject missing/inactive); `authorize(...roles)` factory returning a role-check middleware
- **src/services/authService.js**: `register` (domain check, bcrypt cost 10), `login` (generic "Invalid credentials" message), `updateMe`, `changePassword`
- **src/controllers/authController.js**: thin handlers delegating to authService
- **src/routes/auth.routes.js**: 5 endpoints + 20 req/15 min rate limiter on public routes
- **src/app.js**: mounts `/api/auth`; registers test-only `/api/_debug/officer-only` when `NODE_ENV=test`
- **scripts/smoke-auth.js**: 19-check live smoke test using Node 18 built-in fetch

### Decisions
- Identical "Invalid credentials" message for wrong email and wrong password prevents email enumeration attacks
- `passwordHash` has `select: false` at schema level; `authService.login` explicitly adds `.select('+passwordHash')` — the only place it's ever retrieved
- Rate limiter on register/login only — authenticated endpoints are protected by JWT, which is harder to brute-force
- Debug route guarded by `NODE_ENV === 'test'` — never registered in production or development

### Known Gaps
- No `PATCH /api/auth/me` or `POST /api/auth/change-password` smoke coverage yet — added to integration test list for B8

### Verification
`node scripts/smoke-auth.js` (with server running `NODE_ENV=test`) → **19 PASS, 0 FAIL**

---

## 2026-09-30 | Prompt 4 — Admin-Managed Master Data (Categories & Users)

### What was built
- **src/utils/escapeRegex.js**: helper function escaping regex special characters for safe dynamic text searches
- **src/validators/category.validators.js**: `validateCreateCategory`, `validateUpdateCategory`
- **src/validators/user.validators.js**: `validateCreateUser`, `validateUpdateUser`; reuses `isValidPassword`
- **src/services/categoryService.js**: `getCategories` (active-only by default, `?all=true` for admin, sorted by name, populated `defaultHandler`), `createCategory` (unique name check, active officer handler validation), `updateCategory`, `deleteCategory` (soft delete with `isActive: false`)
- **src/services/userService.js**: `getUsers` (paginated, filters by role/department/isActive, regex-safe search), `createUser` (admin creates any role with temp password, officer department check, bcrypt hash), `updateUser` (self-deactivation/demotion guards, last active admin protection), `getOfficers` (active officers, officer locked to own department, admin can view all or filter by department)
- **src/controllers/categoryController.js** & **src/controllers/userController.js**: thin async controllers using `sendSuccess` and `asyncHandler`
- **src/routes/category.routes.js** & **src/routes/user.routes.js**: mounted at `/api/categories` and `/api/users`; `/api/users/officers` defined before `/:id`
- **scripts/smoke-master-data.js**: 43-assertion live smoke test exercising all 8 master data endpoints, RBAC rejections, input validations, soft deletion, and last-admin guards

### Decisions
- `/api/users/officers` placed before `/api/users/:id` in route order to prevent Express matching `:id = 'officers'`
- Search queries sanitized with `escapeRegex` to prevent regex injection (ReDoS or invalid regex syntax crashes)
- Soft deletion retains category documents with `isActive: false` so existing complaints keep valid references
- Admin self-protection & last active admin guards enforced at service layer with 409 Conflict

### Known Gaps
- Category update does not yet cascade-notify if defaultHandler changes (notifications feature in future prompt)
- Frontend client pages for category/user management to be built in client prompt

### Verification
`node scripts/smoke-master-data.js` (with server running `NODE_ENV=test`) → **43 PASS, 0 FAIL**  
`node scripts/smoke-auth.js` → **19 PASS, 0 FAIL**

---

## 2026-09-30 | Prompt 5 — Complaints: Create, List, Detail, Attachments

### What was built
- **server/src/middleware/upload.js**: Multer disk-storage middleware — 16-byte hex random filenames, absolute path resolved at module load (`path.resolve(config.uploadDir)`), MIME type check in `fileFilter` (jpg/png/pdf), per-file 5 MB and 3-file count limits; custom error with `err.status = 400` for MIME rejection
- **server/src/validators/complaint.validators.js**: `validateCreateComplaint` — title 5-120, description 20-2000, valid ObjectId for category, optional priority enum check
- **server/src/services/complaintService.js**: full service with:
  - `toId(field)` helper — safely extracts a string ID from either a raw ObjectId or a populated sub-document (fixes `[object Object]` comparison bug)
  - `canView(user, complaint)` / `assertCanView` — admin pass-through; owner always sees own; officer sees if assigned or if unassigned in same dept
  - `applyFiledByMask` — sets `filedBy=null` and `filedByLabel="Anonymous"` for anonymous complaints viewed by non-owners
  - `buildSort(sortParam)` — parses `-createdAt` / `dueAt` style strings
  - `createComplaint` — sets code+dueAt via `Complaint.createWithCode`, writes Submitted StatusLog, auto-assigns when `category.defaultHandler` is an active officer (second log changedBy=null)
  - `listComplaints` — full role-scoped query with scope param for officers, search, overdue, sort, pagination
  - `getComplaintById` — full detail: statusLogs (null changedBy → `{name:"System"}`), feedback, masking
  - `resolveAttachment` — path-traversal-safe filename lookup, returns absolute `path.resolve(...)` path
- **server/src/controllers/complaintController.js**: thin wrappers; `downloadAttachment` uses `res.sendFile(absolutePath)` directly
- **server/src/routes/complaint.routes.js**: multer before `validateBody` so files land before body validation; `/:id/attachments/:filename` after `/:id`
- **server/src/app.js**: mounts `/api/complaints`, creates upload dir with `fs.mkdirSync` at startup
- **server/src/middleware/errorHandler.js**: extended to handle `MulterError` codes (`LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`) with friendly messages, and plain errors with `err.status = 400` (from fileFilter)
- **server/scripts/smoke-complaints.js**: 15-check live smoke test covering valid create, validation errors, MIME/size rejection, officer forbidden, list scoping by role, anonymous masking, access denied (student B → student A), auto-assign, detail with statusLogs, invalid ObjectId → 404

### Decisions
- `toId()` helper used in `canView` instead of `.toString()` directly — populated Mongoose documents return `[object Object]` from `.toString()`; `.lean()` gives plain JS but populated nested docs still have `._id`
- `upload.js` resolves `UPLOAD_ABS = path.resolve(config.uploadDir)` once at module load so multer destination is always absolute regardless of CWD at runtime
- `resolveAttachment` uses `path.resolve` and `fs.existsSync` before handing path to `res.sendFile` — prevents path-traversal and gives a clean 404 if the file was deleted
- Officers list: `scope=unassigned` pre-fetches category IDs for the department (a second DB query) rather than a `$lookup` aggregation — simpler, readable, acceptable at this scale
- `isAnonymous` field is coerced from the string `"true"` because multipart/form-data sends all fields as strings
- `allowedActions` / `allowedNextStatuses` left for B6 (workflow service)

### Known Gaps
- Smoke test requires a running server with a seeded DB (`npm run seed` — built in B8)
- Auto-assign test is skipped with a warning if no category has a `defaultHandler` (seed not yet run)
- `allowedActions` on GET /complaints/:id added in B6

### Verification
All files verified by static review. Smoke script ready to run once `.env` is configured and `npm run seed` is executed.

---

## 2026-09-30 | Prompt 6 — Workflow: Assign, Status, Verify, Reopen, Feedback, Auto-Close

### What was built
- **server/src/services/workflowService.js**: All complaint state transitions in one service:
  - `toId(field)` imported from `complaintService` — no circular dependency
  - `throwIfRace(updated)` — 409 when atomic update returns null (concurrent modification)
  - `assignComplaint` — first assign (Submitted→Acknowledged) and reassign (same status); officer dept restriction
  - `changeStatus` — Acknowledged→In Progress and In Progress→Resolved (with `resolvedAt`); assigned officer or admin only
  - `verifyAndClose` — Resolved→Closed (owner only); sets `closedAt`
  - `reopen` — Resolved→In Progress (owner only); `$inc reopenCount`, clears `resolvedAt`
  - `submitFeedback` — Closed complaints only, one per complaint; duplicate → 11000 → errorHandler → 409
  - `autoCloseResolved` — finds Resolved complaints older than `AUTO_CLOSE_DAYS`, closes them atomically, writes StatusLog changedBy=null
  - `getAllowedActions(user, complaint, feedbackExists)` — computes `{allowedActions, allowedNextStatuses}` for the frontend
- **server/src/controllers/workflowController.js**: Thin handler per endpoint, all logic in service
- **server/src/routes/complaint.routes.js**: Added `PATCH /:id/assign`, `PATCH /:id/status`, `POST /:id/verify`, `POST /:id/reopen`, `POST /:id/feedback`; specific paths before `/:id` to prevent Express routing conflicts
- **server/src/jobs/autoClose.js**: `node-cron` hourly schedule (`0 * * * *`); exports `startAutoCloseJob` and re-exports `autoCloseResolved` for direct test calls
- **server/src/server.js**: Calls `startAutoCloseJob()` after `connectDB()` — never from app.js
- **server/src/app.js**: Added two `NODE_ENV=test` debug endpoints:
  - `PATCH /api/_debug/backdate/:id` — sets `resolvedAt` N days in the past (admin only)
  - `POST /api/_debug/run-autoclose` — calls `autoCloseResolved()` on demand (admin only)
- **server/src/services/complaintService.js**: `getComplaintById` now calls `getAllowedActions` (lazy require to break circular dep) and appends `allowedActions`/`allowedNextStatuses` to the response
- **server/scripts/smoke-workflow.js**: 9-section live smoke test with 39 assertions covering the full lifecycle

### Decisions
- Atomic pattern: `findOneAndUpdate({ _id, status: currentStatus }, ...)` — if another request changed the status, `updated` is null → `throwIfRace` throws 409. No mongoose version-key (`__v`) needed.
- `getAllowedActions` lives in `workflowService` (not `complaintService`) because it requires status knowledge and future workflow rule changes should all be in one file
- Lazy `require('./workflowService')` inside `getComplaintById` body breaks the mutual-import cycle cleanly without restructuring files
- `submitFeedback` relies on the Mongoose unique index on `Feedback.complaint` for the one-per-complaint guarantee; no explicit pre-check needed — the 11000 duplicate-key error hits `errorHandler` and becomes 409
- The `reopen` function uses both `$set` and `$inc` in a single `findOneAndUpdate` — both operators apply atomically
- Debug endpoints are registered only when `NODE_ENV=test` and guarded by `authorize('admin')` — safe from accidental exposure in production

### Known Gaps
- Smoke test requires a seeded DB with `student1@campus.edu`, `student2@campus.edu`, `officer.hostel@campus.edu`, `admin@campus.edu`
- Officer cross-department assignment restriction tested via service logic; a full cross-dept test needs two officer accounts in different departments (available after B8 seed)

### Verification
- `node --check` passes on all 6 new/modified files
- Smoke test (`node scripts/smoke-workflow.js`) ready to run with server on `NODE_ENV=test` + seeded DB

---

## 2026-09-30 | Prompt 7 — Comments and Analytics

### What was built
- **server/src/services/commentService.js**:
  - `listComments(user, complaint)` — ascending order; strips `isInternal` comments for complainants; applies anonymous masking (`maskCommentAuthor`) per comment
  - `postComment(user, complaint, { text, isInternal })` — rejects Closed (409); enforces complainant cannot set `isInternal: true` (403); forces `isInternal` false for complainants regardless
- **server/src/services/analyticsService.js**:
  - `getSummary()` — 11 concurrent aggregations: status counts, overdue, byCategory (lookup), byDepartment (lookup), byPriority, createdByMonth (last 6), resolvedByMonth (last 6), avgResolutionHours, avgRating, totalCount, reopenedCount. All missing months/statuses/priorities zero-filled.
  - `getMySummary(user)` — dispatches to `complainantSummary`, `officerSummary`, or `adminMySummary` by role; officer summary includes `unassignedPool` via category-department join
- **server/src/controllers/commentController.js**: Loads complaint once (with `category` populated for `assertCanView`), delegates to service
- **server/src/controllers/analyticsController.js**: Thin wrappers for `getSummary` (admin) and `getMySummary` (any auth)
- **server/src/validators/comment.validators.js**: `text` 1–1000, `isInternal` boolean type check
- **server/src/routes/complaint.routes.js**: Added `GET /:id/comments` and `POST /:id/comments` (placed after `/:id` — specific before wildcard)
- **server/src/routes/analytics.routes.js**: `GET /summary` (admin) and `GET /my-summary` (any auth)
- **server/src/app.js**: Mounted `/api/analytics`
- **server/scripts/smoke-comments-analytics.js**: 5-section smoke test with 35+ assertions

### Decisions
- `maskCommentAuthor` mutates the `author` field in-place on the plain JS object (lean); never touches the DB document
- Anonymous masking checks `filedBy` against `author._id` — if the complainant wrote the comment and the requester is not the owner, the name is replaced; the `_id` is kept so the frontend can still use it for UI identity if needed
- `analyticsService.getSummary` fires all 11 aggregations via `Promise.all` — no sequential bottleneck
- `lastNMonths(6)` generates calendar-month labels in the server's local timezone; `$dateToString` in MongoDB uses UTC. Both consistent as long as the server doesn't straddle midnight timezone boundaries (acceptable for a campus system)
- `unassignedPool` counts complaints with `assignedTo: null` in any active category belonging to the officer's `department` — this is the "triage inbox" the officer sees on their dashboard

### Verification
- `node --check` passes on all 9 new/modified files
- Smoke test ready: `node scripts/smoke-comments-analytics.js` (server on `NODE_ENV=test`, DB seeded)

---

## 2026-10-02 | Prompt F1 — Frontend Foundation & Reusable Design System

### What was built
- **client/ (Vite + React 18)**: Scaffolding with plain JavaScript and JSX. Configured Vite with `@tailwindcss/vite` (Tailwind v4) and React 18 plugin. Created `client/.env.example` and `client/.env` (`VITE_API_URL=http://localhost:5000/api`). Installed allowed dependencies: `react-router-dom`, `axios`, `tailwindcss`, `lucide-react`, `react-hot-toast`, `recharts`.
- **src/lib/**:
  - `constants.js`: Definitions for statuses, priorities, roles, role labels, and curated Tailwind color mappings for badges, borders, and dots.
  - `format.js`: Date and time helpers (`formatDate`, `formatDateTime`, `timeAgo`, `daysBetween`) using native `Intl` and `Date` APIs.
  - `classNames.js`: 5-line utility joining truthy class strings.
- **src/api/**:
  - `client.js`: Axios client with `baseURL` from env, request interceptor attaching token from `localStorage`, response interceptor redirecting to `/login` on 401 and normalizing API envelope errors (`{ message, status, errors }`).
  - Resource modules: `auth.js`, `complaints.js` (including multipart form handling and attachment helpers), `categories.js`, `users.js`, `analytics.js`, `comments.js` strictly matching `docs/API_CONTRACT.md`.
- **src/hooks/**:
  - `useFetch.js`: Custom hook handling request cancellation to prevent race conditions, background polling on interval (`pollMs`), and window focus refresh.
  - `useAuth.js`: Context hook accessing authenticated user state, login, logout, and role helpers.
- **src/context/**:
  - `authContextInstance.js` & `AuthContext.jsx`: State management with `token`, `user`, `role`, `loginUser`, and `logout`.
- **src/components/ui/**: 18 hand-crafted, accessible Tailwind components:
  - `Button`, `Input`, `Textarea`, `Select`, `Toggle`, `FormField`, `Card`, `Badge`, `StatusBadge`, `PriorityBadge`, `Modal` (Esc key, click-outside, focus lock), `ConfirmDialog`, `Spinner`, `Skeleton`, `EmptyState`, `Pagination`, `Tabs`, `StarRating` (interactive input + read-only score), `PageHeader`. Barrel export at `components/ui/index.js`.
- **src/components/layout/**:
  - `AppLayout.jsx`: Responsive layout with desktop sidebar, mobile slide-in drawer with backdrop, sticky top bar, user menu, and role-aware navigation (`student`/`staff`, `officer`, `admin`).
- **src/routes/AppRoutes.jsx & src/pages/**:
  - `UiKitPage.jsx` at `/ui-kit`: Full visual preview and interactive testbed for all 18 UI components + active role simulator.
  - `DashboardPage.jsx` at `/`: Overview and link to UI Kit.
  - `PlaceholderPage.jsx` for remaining routes.
  - `<Toaster />` from `react-hot-toast` mounted at root with customized styling.

### Decisions
- Adopted Tailwind CSS v4 using the official `@tailwindcss/vite` plugin and modern CSS `@import "tailwindcss"` with `@layer base` for clean system font styling.
- Separated `authContextInstance.js` from `AuthContext.jsx` and `useAuth.js` to satisfy Fast Refresh and oxlint component-only export constraints.
- `useFetch` leverages an effect cancellation flag and request counter to ensure out-of-order async responses never overwrite newer state.
- Form inputs and controls use slate neutrals and indigo-600 accents with accessible focus rings and rose-600 validation feedback.

### Known Gaps
- Interactive browser subagent was blocked by an external Playwright driver CDN 404 in the sandbox; manual HTTP verification confirmed successful HTML/asset serving at `http://localhost:5173/`.
- Full auth forms and complaint forms will be implemented in F2 and F3.

### Verification
- `npm run build` in `/client`: **PASS** (1978 modules, 380ms).
- `npm run lint` in `/client`: **PASS** (0 warnings, 0 errors across 42 files).
- HTTP GET `http://localhost:5173/`: returned HTTP 200 with valid document markup.

