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

## Endpoint Index

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | Public | Server + DB health check |
| POST | /api/auth/register | Public | Register a student or staff account |
| POST | /api/auth/login | Public | Login and receive a JWT |
| GET | /api/auth/me | Bearer JWT | Get the current user |
| PATCH | /api/auth/me | Bearer JWT | Update name / department |
| POST | /api/auth/change-password | Bearer JWT | Change password |

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

