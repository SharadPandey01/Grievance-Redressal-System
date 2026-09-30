# API Contract — Campus Grievance Redressal System

## Conventions

### Base Path
All endpoints are prefixed with `/api`.

### Authentication
Include the JWT in the `Authorization` header:
```
Authorization: Bearer <token>
```
Token payload: `{ id, role }`. Expires in 7 days.

### Response Envelope

**Success (single resource or action)**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success (list)**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

**Error**
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Must be a valid email" }
  ]
}
```
`errors` array is only present on 400 validation failures.

### HTTP Status Codes
| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated (missing or invalid token) |
| 403 | Forbidden (authenticated but not authorised) |
| 404 | Resource not found |
| 409 | Conflict (illegal state transition, duplicate key) |
| 500 | Internal server error |

### Pagination Query Parameters
| Parameter | Default | Max |
|---|---|---|
| `page` | 1 | — |
| `limit` | 10 | 50 |

---

## Endpoint Index

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | Public | Server + DB health check |
| POST | /api/auth/register | Public | Register a student or staff account |
| POST | /api/auth/login | Public | Login and receive a JWT |
| GET | /api/auth/me | Bearer JWT | Get the current user |
| PATCH | /api/auth/me | Bearer JWT | Update name / department |
| POST | /api/auth/change-password | Bearer JWT | Change password |
| GET | /api/categories | Bearer JWT | List categories (active only; ?all=true for admin) |
| POST | /api/categories | Bearer JWT (admin) | Create category |
| PATCH | /api/categories/:id | Bearer JWT (admin) | Update category |
| DELETE | /api/categories/:id | Bearer JWT (admin) | Soft delete category (isActive=false) |
| GET | /api/users | Bearer JWT (admin) | Paginated list of users with filters & search |
| POST | /api/users | Bearer JWT (admin) | Create user of any role with temporary password |
| PATCH | /api/users/:id | Bearer JWT (admin) | Update user role, department, name, isActive |
| GET | /api/users/officers | Bearer JWT (officer, admin) | Active officers for assignment dropdown |
| POST | /api/complaints | Bearer JWT (student, staff) | File a new complaint (multipart/form-data) |
| GET | /api/complaints | Bearer JWT | List complaints (role-scoped, paginated) |
| GET | /api/complaints/:id | Bearer JWT | Full complaint detail with logs, attachments, feedback, allowedActions |
| GET | /api/complaints/:id/attachments/:filename | Bearer JWT | Stream/download one attachment file |
| PATCH | /api/complaints/:id/assign | Bearer JWT (officer, admin) | Assign or reassign complaint to an officer |
| PATCH | /api/complaints/:id/status | Bearer JWT | Advance status: Acknowledged→In Progress or In Progress→Resolved |
| POST | /api/complaints/:id/verify | Bearer JWT (owner) | Confirm resolution: Resolved→Closed |
| POST | /api/complaints/:id/reopen | Bearer JWT (owner) | Reopen: Resolved→In Progress |
| POST | /api/complaints/:id/feedback | Bearer JWT (owner) | Submit star rating + comment after Closed |
| GET | /api/complaints/:id/comments | Bearer JWT | List comments (complainants exclude internal) |
| POST | /api/complaints/:id/comments | Bearer JWT | Post a comment; isInternal officer/admin only |
| GET | /api/analytics/summary | Bearer JWT (admin) | Global aggregated analytics |
| GET | /api/analytics/my-summary | Bearer JWT | Role-aware personal analytics |

> Rate limit on register and login: 20 requests / 15 min / IP.

---

## GET /api/health

**Auth:** Public  
**Description:** Returns server uptime and MongoDB connection status.

**Response 200**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 42.5,
    "db": "connected"
  }
}
```

---

## POST /api/auth/register

**Auth:** Public  
**Rate limit:** 20 / 15 min / IP  
**Description:** Creates a new student or staff account. Officers and admins are created only via the seed script or admin API.

**Request body**
| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | ✅ | |
| email | string | ✅ | Lowercased; must match ALLOWED_EMAIL_DOMAIN if set |
| password | string | ✅ | Min 8 chars, ≥1 letter, ≥1 number |
| role | string | ✅ | `student` or `staff` only |
| department | string | ❌ | Optional |

**Response 201** — user object (no `passwordHash`, no token)
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Alice",
    "email": "alice@campus.edu",
    "role": "student",
    "isActive": true,
    "createdAt": "2026-09-30T00:00:00.000Z",
    "updatedAt": "2026-09-30T00:00:00.000Z"
  }
}
```

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation failure (see `errors` array) |
| 400 | Email domain not allowed |
| 409 | Email already registered |

---

## POST /api/auth/login

**Auth:** Public  
**Rate limit:** 20 / 15 min / IP  
**Description:** Authenticates a user and returns a JWT (7 days).

**Request body**
| Field | Type | Required |
|---|---|---|
| email | string | ✅ |
| password | string | ✅ |

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "_id": "...", "name": "Alice", "email": "alice@campus.edu", "role": "student" }
  }
}
```

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation failure |
| 401 | "Invalid credentials" (wrong email or password — same message to prevent enumeration) |
| 403 | Account is deactivated |

---

## GET /api/auth/me

**Auth:** Bearer JWT  
**Description:** Returns the authenticated user's profile.

**Response 200** — user object (same shape as register response)

**Errors**
| Code | Reason |
|---|---|
| 401 | Missing, invalid, or expired token |

---

## PATCH /api/auth/me

**Auth:** Bearer JWT  
**Description:** Update `name` and/or `department` for the current user. Both fields are optional; send only what should change.

**Request body**
| Field | Type | Required |
|---|---|---|
| name | string | ❌ |
| department | string | ❌ |

**Response 200** — updated user object

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation failure |
| 401 | Unauthenticated |

---

## POST /api/auth/change-password

**Auth:** Bearer JWT  
**Description:** Changes the current user's password. Current password must match; new password must differ and pass strength rules.

**Request body**
| Field | Type | Required |
|---|---|---|
| currentPassword | string | ✅ |
| newPassword | string | ✅ — min 8 chars, ≥1 letter, ≥1 number |

**Response 200**
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation failure or current password incorrect or new == current |
| 401 | Unauthenticated |

---

## GET /api/categories

**Auth:** Bearer JWT (any role)  
**Description:** Returns categories sorted by name. Regular users see only active categories. Admins can provide `?all=true` to view inactive categories as well.

**Query Parameters**
| Parameter | Type | Required | Description |
|---|---|---|---|
| all | string | ❌ | When `"true"` and user is admin, includes inactive categories |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Hostel Maintenance",
      "description": "Plumbing, electrical, and furniture issues in hostels",
      "department": "Hostel",
      "defaultHandler": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Warden Office"
      },
      "isActive": true,
      "createdAt": "2026-09-30T00:00:00.000Z",
      "updatedAt": "2026-09-30T00:00:00.000Z"
    }
  ]
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |

---

## POST /api/categories

**Auth:** Bearer JWT (admin only)  
**Description:** Creates a new category with a unique name and optional default handler (must be an active officer).

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| name | string | ✅ | Unique category name |
| department | string | ✅ | Responsible department name |
| description | string | ❌ | Category description (default: "") |
| defaultHandler | string (ObjectId) | ❌ | ID of active user with officer role |

**Response 201** — created category object with populated `defaultHandler` (`_id`, `name`)

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation error (missing required field, handler not an active officer) |
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |
| 409 | Category name already exists |

---

## PATCH /api/categories/:id

**Auth:** Bearer JWT (admin only)  
**Description:** Updates category fields (`name`, `description`, `department`, `defaultHandler`, `isActive`).

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| name | string | ❌ | Unique category name |
| department | string | ❌ | Department name |
| description | string | ❌ | Category description |
| defaultHandler | string (ObjectId) / null | ❌ | Active officer ID or null to clear |
| isActive | boolean | ❌ | Active status flag |

**Response 200** — updated category object with populated `defaultHandler` (`_id`, `name`)

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation error or invalid ID |
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |
| 404 | Category not found |
| 409 | Renaming to an already existing category name |

---

## DELETE /api/categories/:id

**Auth:** Bearer JWT (admin only)  
**Description:** Soft-deletes a category by setting `isActive: false`. Existing complaints keep their references.

**Response 200** — category object with `isActive: false`

**Errors**
| Code | Reason |
|---|---|
| 400 | Invalid ID format |
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |
| 404 | Category not found |

---

## GET /api/users

**Auth:** Bearer JWT (admin only)  
**Description:** Returns paginated list of users with filtering and regex-safe search.

**Query Parameters**
| Parameter | Type | Required | Description |
|---|---|---|---|
| page | number | ❌ | Page number (default: 1) |
| limit | number | ❌ | Page size (default: 10, max: 50) |
| role | string | ❌ | Filter by role (`student`, `staff`, `officer`, `admin`) |
| department | string | ❌ | Filter by department |
| isActive | string | ❌ | Filter by status (`"true"` or `"false"`) |
| search | string | ❌ | Case-insensitive regex-escaped search on name and email |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "name": "Prof. Rao",
      "email": "officer.hostel@campus.edu",
      "role": "officer",
      "department": "Hostel",
      "isActive": true,
      "createdAt": "2026-09-30T00:00:00.000Z",
      "updatedAt": "2026-09-30T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |

---

## POST /api/users

**Auth:** Bearer JWT (admin only)  
**Description:** Creates a user of any role with a temporary password. Department is required for officers.

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| name | string | ✅ | Full name |
| email | string | ✅ | Unique valid email address |
| password | string | ✅ | Temporary password (min 8 chars, ≥1 letter, ≥1 number) |
| role | string | ✅ | One of `student`, `staff`, `officer`, `admin` |
| department | string | Optional (✅ for officer) | Department assignment |

**Response 201** — created user object (without `passwordHash`)

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation error (e.g. weak password, missing department for officer) |
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |
| 409 | Email already exists |

---

## PATCH /api/users/:id

**Auth:** Bearer JWT (admin only)  
**Description:** Updates a user's details (`role`, `department`, `isActive`, `name`). Protected by self-action and last-admin safety guards.

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| name | string | ❌ | Full name |
| role | string | ❌ | One of `student`, `staff`, `officer`, `admin` |
| department | string | ❌ | Department (required if role is officer) |
| isActive | boolean | ❌ | Active status flag |

**Response 200** — updated user object

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation error, invalid ID, or missing department when role is officer |
| 401 | Unauthenticated |
| 403 | Forbidden (non-admin) |
| 404 | User not found |
| 409 | Admin self-deactivation/demotion, or attempting to demote/deactivate the last remaining active admin |

---

## GET /api/users/officers

**Auth:** Bearer JWT (officer or admin)  
**Description:** Retrieves active officers for assignment dropdowns. Officers can only view officers in their own department; admins can view all or filter with `?department=`.

**Query Parameters**
| Parameter | Type | Required | Description |
|---|---|---|---|
| department | string | ❌ | Filter by department (used by admin; officers are always locked to own department) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "name": "Prof. Rao",
      "email": "officer.hostel@campus.edu",
      "department": "Hostel"
    }
  ]
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | Forbidden (student/staff role) |

---

## POST /api/complaints

**Auth:** Bearer JWT (student or staff only)  
**Content-Type:** `multipart/form-data`  
**Description:** Files a new complaint. `filedBy` is set from the JWT — the body cannot override it. If the category has an active `defaultHandler` officer, the complaint is immediately auto-assigned and promoted to `Acknowledged`.

**Form fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| title | string | ✅ | 5–120 characters |
| description | string | ✅ | 20–2000 characters |
| category | string (ObjectId) | ✅ | Must be an active category |
| priority | string | ❌ | `Low`, `Medium` (default), `High` |
| isAnonymous | string | ❌ | `"true"` or `"false"` (default `"false"`) |
| files | file | ❌ | Up to 3 files; jpg/png/pdf; max 5 MB each; field name must be `files` |

**Response 201** — created complaint object including `code`, `dueAt`, `status`, `attachments`
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "GRV-2026-0001",
    "title": "Water leakage in hostel room 204",
    "description": "...",
    "category": "...",
    "priority": "Medium",
    "status": "Submitted",
    "filedBy": "...",
    "isAnonymous": false,
    "assignedTo": null,
    "attachments": [],
    "dueAt": "2026-10-05T00:00:00.000Z",
    "resolutionNotes": "",
    "reopenCount": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```
If auto-assigned: `status` = `"Acknowledged"` and `assignedTo` is populated.

**Errors**
| Code | Reason |
|---|---|
| 400 | Validation error on text fields (see `errors` array) |
| 400 | Invalid/inactive category ID |
| 400 | File type not allowed (only jpg, png, pdf) |
| 400 | File too large (max 5 MB) |
| 400 | Too many files (max 3) |
| 401 | Unauthenticated |
| 403 | Authenticated user is not a complainant (student/staff) |

---

## GET /api/complaints

**Auth:** Bearer JWT (any role)  
**Description:** Returns a paginated, role-scoped list of complaints.

**Scoping rules**
- **student / staff**: own complaints only (`filedBy === me`)
- **officer**: `scope=assigned` (default) → assigned to me; `scope=unassigned` → unassigned in my department; `scope=all` → both
- **admin**: all complaints

**Query Parameters**
| Parameter | Type | Description |
|---|---|---|
| page | number | Default 1 |
| limit | number | Default 10, max 50 |
| status | string | Filter by status value |
| priority | string | Filter by `Low`, `Medium`, `High` |
| category | string (ObjectId) | Filter by category ID |
| assignedTo | string (ObjectId) | Filter by assigned officer ID |
| search | string | Case-insensitive search on `title` and `code` |
| overdue | string | `"true"` → only overdue complaints |
| sort | string | `createdAt`, `dueAt`, `priority`; prefix `-` for descending. Default: `-createdAt` |
| scope | string | Officer only: `assigned` (default), `unassigned`, `all` |

**Anonymous masking**: anonymous complaints show `filedBy: null` and `filedByLabel: "Anonymous"` to officers and admins (except the owner who always sees their own name).

**Response 200** — paginated list with `meta`
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "GRV-2026-0001",
      "title": "Water leakage in hostel room 204",
      "status": "Submitted",
      "priority": "Medium",
      "isAnonymous": false,
      "isOverdue": false,
      "dueAt": "...",
      "category": { "_id": "...", "name": "Hostel & Mess", "department": "Hostel Administration" },
      "assignedTo": null,
      "filedBy": { "_id": "...", "name": "Alice" },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |

---

## GET /api/complaints/:id

**Auth:** Bearer JWT  
**Description:** Returns the full detail of one complaint, including `statusLogs`, `feedback`, and `isOverdue`. The `allowedActions` and `allowedNextStatuses` fields will be added in B6.

**Access rules** (403 if none match):
- The complaint's owner (`filedBy`)
- The assigned officer
- Any officer in the same department as the complaint's category (if unassigned)
- Any admin

**Populated fields**: `category {name, department}`, `assignedTo {name, department}`, `filedBy {name}` (masked if anonymous), `statusLogs[].changedBy {name, role}` (null → `{ name: "System", role: null }`)

**Response 200**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "GRV-2026-0001",
    "title": "...",
    "description": "...",
    "status": "Submitted",
    "priority": "Medium",
    "isAnonymous": false,
    "isOverdue": false,
    "dueAt": "...",
    "resolutionNotes": "",
    "reopenCount": 0,
    "category": { "_id": "...", "name": "Hostel & Mess", "department": "Hostel Administration" },
    "assignedTo": null,
    "filedBy": { "_id": "...", "name": "Alice" },
    "attachments": [
      { "originalName": "photo.jpg", "filename": "abc123.jpg", "mimetype": "image/jpeg", "size": 204800 }
    ],
    "statusLogs": [
      { "_id": "...", "fromStatus": null, "toStatus": "Submitted", "changedBy": { "name": "Alice", "role": "student" }, "note": "Complaint submitted", "timestamp": "..." }
    ],
    "feedback": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | User does not have access to this complaint |
| 404 | Complaint not found (invalid ObjectId or deleted) |

---

## GET /api/complaints/:id/attachments/:filename

**Auth:** Bearer JWT (same access rules as GET /api/complaints/:id)  
**Description:** Streams/downloads one attachment file. The `filename` parameter is the server-generated random filename stored in `complaint.attachments[].filename`.

**Response 200** — binary file stream  
Headers: `Content-Type: <mimetype>`, `Content-Disposition: attachment; filename="<originalName>"`

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | No access to the complaint |
| 404 | Complaint not found, or filename is not in this complaint's attachments list |

---

## PATCH /api/complaints/:id/assign

**Auth:** Bearer JWT (officer or admin)  
**Description:** Assign or reassign a complaint to an active officer.
- **First assignment** (status = `Submitted`): promotes to `Acknowledged`, writes a Submitted→Acknowledged StatusLog.
- **Reassignment**: keeps the current status, writes a same-status StatusLog with the note.
- Closed complaints cannot be reassigned → 409.

**Role rules:**
- Officer: may assign to themselves or any active officer in their own department.
- Admin: may assign to any active officer.

**Request body**
```json
{ "assigneeId": "<ObjectId>", "note": "Optional context note" }
```

**Response 200** — updated complaint (populated)

**Errors**
| Code | Reason |
|---|---|
| 400 | `assigneeId` missing / not a valid ObjectId / target is not an active officer |
| 401 | Unauthenticated |
| 403 | Not an officer or admin; or officer trying to assign across departments |
| 404 | Complaint not found |
| 409 | Complaint is Closed; or concurrent state change (refresh and retry) |

---

## PATCH /api/complaints/:id/status

**Auth:** Bearer JWT (assigned officer or admin only — enforced by service, not middleware)  
**Description:** Advance the complaint status through the officer/admin path.

Allowed transitions via this endpoint:
- `Acknowledged` → `In Progress`
- `In Progress` → `Resolved` (requires `resolutionNotes`)

Sets `resolvedAt` when transitioning to `Resolved`.

**Request body**
```json
{
  "toStatus": "In Progress",
  "note": "Starting investigation (3–500 chars)",
  "resolutionNotes": "Required only when toStatus = Resolved (1–2000 chars)"
}
```

**Response 200** — updated complaint (populated)

**Errors**
| Code | Reason |
|---|---|
| 400 | `toStatus` not one of `In Progress` / `Resolved`; note too short/long; `resolutionNotes` missing when resolving |
| 401 | Unauthenticated |
| 403 | Caller is not the assigned officer or an admin |
| 404 | Complaint not found |
| 409 | Transition not legal from current status; or concurrent update |

---

## POST /api/complaints/:id/verify

**Auth:** Bearer JWT (complaint owner only)  
**Description:** Complainant confirms the resolution is satisfactory. Transitions `Resolved → Closed`, sets `closedAt`.

**Request body:** empty / no fields required

**Response 200** — updated complaint

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | Caller is not the complaint owner |
| 404 | Complaint not found |
| 409 | Complaint is not in `Resolved` status |

---

## POST /api/complaints/:id/reopen

**Auth:** Bearer JWT (complaint owner only)  
**Description:** Complainant is not satisfied with the resolution. Transitions `Resolved → In Progress`, increments `reopenCount`, clears `resolvedAt`. The reason is stored in the StatusLog note.

**Request body**
```json
{ "reason": "Issue is still present after the fix (10–500 chars)" }
```

**Response 200** — updated complaint (`reopenCount` incremented)

**Errors**
| Code | Reason |
|---|---|
| 400 | `reason` missing or outside 10–500 characters |
| 401 | Unauthenticated |
| 403 | Caller is not the complaint owner |
| 404 | Complaint not found |
| 409 | Complaint is not in `Resolved` status |

---

## POST /api/complaints/:id/feedback

**Auth:** Bearer JWT (complaint owner only)  
**Description:** Complainant rates the resolution experience after the complaint is `Closed`. One submission per complaint — repeat → 409.

**Request body**
```json
{ "rating": 4, "comment": "Optional comment up to 500 chars" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| rating | integer | ✅ | 1–5 (inclusive) |
| comment | string | ❌ | Max 500 characters |

**Response 201** — feedback document
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "complaint": "<complaintId>",
    "rating": 4,
    "comment": "Good resolution, thanks!",
    "givenBy": "<userId>",
    "createdAt": "..."
  }
}
```

**Errors**
| Code | Reason |
|---|---|
| 400 | `rating` out of 1–5 range; `comment` too long |
| 401 | Unauthenticated |
| 403 | Caller is not the complaint owner |
| 404 | Complaint not found |
| 409 | Complaint is not `Closed`; or feedback already submitted |

---

## allowedActions / allowedNextStatuses (GET /api/complaints/:id extension)

The detail endpoint now includes two extra fields computed for the **requesting user's** current role and the complaint's current status:

```json
{
  "allowedActions": ["assign", "updateStatus"],
  "allowedNextStatuses": ["In Progress"]
}
```

| Action | When available |
|---|---|
| `assign` | Officer or admin, complaint not Closed |
| `updateStatus` | Assigned officer or admin, status is Acknowledged or In Progress |
| `verify` | Owner, status is Resolved |
| `reopen` | Owner, status is Resolved |
| `feedback` | Owner, status is Closed, no feedback submitted yet |

The frontend should render action buttons **exclusively** from this list and not hard-code any status checks.

---

## GET /api/complaints/:id/comments

**Auth:** Bearer JWT (same access rules as GET /api/complaints/:id — `assertCanView`)  
**Description:** Returns all comments on the complaint in ascending chronological order.

Access rules:
- Complainants (`student`, `staff`) **never** receive `isInternal: true` comments.
- If the complaint is `isAnonymous: true`, comments authored by the complainant are returned with `author.name = "Anonymous"` to everyone except the complaint owner.
- Each comment includes `author: { _id, name, role }`.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "complaint": "<complaintId>",
      "author": { "_id": "...", "name": "Jane Doe", "role": "student" },
      "text": "The fan has been broken for two days.",
      "isInternal": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | No access to the complaint |
| 404 | Complaint not found |

---

## POST /api/complaints/:id/comments

**Auth:** Bearer JWT (same access rules as GET /api/complaints/:id)  
**Description:** Add a comment to the complaint thread.

Rules:
- Complaints with status `Closed` reject new comments → 409.
- `isInternal: true` is only allowed for `officer` and `admin`. Complainants who set it → 403.
- Complainants always have `isInternal` forced to `false` regardless of the body value.

**Request body**
```json
{ "text": "Responding to the issue (1–1000 chars)", "isInternal": false }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| text | string | ✅ | 1–1000 characters |
| isInternal | boolean | ❌ | Default false; officer/admin only for true |

**Response 201** — created comment (populated author)

**Errors**
| Code | Reason |
|---|---|
| 400 | `text` outside 1–1000 characters; `isInternal` not a boolean |
| 401 | Unauthenticated |
| 403 | No access to the complaint; or complainant attempting `isInternal: true` |
| 404 | Complaint not found |
| 409 | Complaint is Closed |

---

## GET /api/analytics/summary

**Auth:** Bearer JWT (admin only)  
**Description:** Global aggregated analytics across all complaints.

**Response 200**
```json
{
  "success": true,
  "data": {
    "totals": {
      "all": 42, "open": 18, "resolved": 10, "closed": 14, "overdue": 3
    },
    "byStatus": [
      { "status": "Submitted", "count": 5 },
      { "status": "Acknowledged", "count": 6 },
      { "status": "In Progress", "count": 7 },
      { "status": "Resolved", "count": 10 },
      { "status": "Closed", "count": 14 }
    ],
    "byCategory": [{ "name": "Hostel", "count": 20 }, ...],
    "byDepartment": [{ "department": "Hostel", "count": 20 }, ...],
    "byPriority": [
      { "priority": "High", "count": 5 },
      { "priority": "Medium", "count": 30 },
      { "priority": "Low", "count": 7 }
    ],
    "monthlyTrend": [
      { "month": "2026-04", "created": 8, "resolved": 3 },
      ...
    ],
    "avgResolutionHours": 47.3,
    "avgRating": 3.8,
    "reopenRate": 11.9
  }
}
```

**Notes:**
- All statuses and priorities are always present in their arrays (zero-filled) — charts never have gaps.
- `monthlyTrend` always has exactly **6 entries** (last 6 calendar months, oldest first).
- `avgResolutionHours`: mean of `(resolvedAt - createdAt)` in hours, over Resolved and Closed complaints.
- `reopenRate`: percentage (0–100, one decimal) of all complaints where `reopenCount > 0`.

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |
| 403 | Not an admin |

---

## GET /api/analytics/my-summary

**Auth:** Bearer JWT (any authenticated user)  
**Description:** Role-aware personal analytics. Shape differs by role.

### Complainant (student / staff)
```json
{
  "byStatus": [
    { "status": "Submitted", "count": 2 },
    { "status": "Acknowledged", "count": 1 },
    { "status": "In Progress", "count": 0 },
    { "status": "Resolved", "count": 1 },
    { "status": "Closed", "count": 3 }
  ],
  "awaitingVerification": 1
}
```
- `byStatus`: counts of **own** complaints by status (all 5 statuses, zero-filled).
- `awaitingVerification`: count of own Resolved complaints (action required from the complainant).

### Officer
```json
{
  "byStatus": [...],
  "overdue": 2,
  "unassignedPool": 5
}
```
- `byStatus`: counts of **assigned** complaints by status.
- `overdue`: assigned open complaints where `dueAt < now`.
- `unassignedPool`: unassigned open complaints whose category belongs to the officer's department.

### Admin
Same shape as complainant but counts are **global** (all complaints, not scoped to a user).

**Errors**
| Code | Reason |
|---|---|
| 401 | Unauthenticated |

