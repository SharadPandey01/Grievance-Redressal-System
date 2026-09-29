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

> Endpoints will be added here as each feature is implemented.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | Public | Server + DB health check |

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
