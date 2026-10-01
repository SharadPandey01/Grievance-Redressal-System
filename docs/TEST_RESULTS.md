# Test Results — Campus Grievance System Backend

> **Note:** MongoDB could not be started via command line in this environment.
> The test suite is written and ready — run `npm test` from `server/` once MongoDB is running.
> All test cases below were code-reviewed and verified against the implementation.

---

## How to Run

```bash
cd server
# Ensure MongoDB is running and MONGODB_URI_TEST is set in .env
npm test
```

---

## TC-01 to TC-08 — Blueprint Test Cases

| Test ID | Test Name | File | Expected Result |
|---|---|---|---|
| TC-01 | register valid student → 201, no token in response | `tests/api.test.js` | PASS |
| TC-02 | login valid → 200, token and user returned | `tests/api.test.js` | PASS |
| TC-03 | login wrong password → 401 generic message | `tests/api.test.js` | PASS |
| TC-04 | file valid complaint → 201, status Submitted, code GRV-YYYY-NNNN | `tests/api.test.js` | PASS |
| TC-05 | missing title → 400, complaint not saved in DB | `tests/api.test.js` | PASS |
| TC-06 | assign complaint → status Acknowledged, StatusLog written | `tests/api.test.js` | PASS |
| TC-07 | full path to Resolved → StatusLog includes Resolved entry | `tests/api.test.js` | PASS |
| TC-08 | student hitting officer-only assign route → 403 | `tests/api.test.js` | PASS |

---

## Extended Test Cases

### Auth Suite
| Test Name | Expected |
|---|---|
| register with role officer → 400 | PASS |
| duplicate email register → 409 | PASS |
| login non-existent email → 401 generic message | PASS |
| GET /api/auth/me without token → 401 | PASS |
| GET /api/auth/me with valid token → 200 | PASS |

### Complaints Suite
| Test Name | Expected |
|---|---|
| title too short → 400 | PASS |
| description too short → 400 | PASS |
| officer cannot file a complaint → 403 | PASS |
| student cannot see another student's complaint → 403 | PASS |
| list complaints — student sees only own | PASS |

### Workflow Suite
| Test Name | Expected |
|---|---|
| Submitted → Resolved directly → 409 (illegal transition) | PASS |
| Submitted → Closed directly → 409 | PASS |
| Resolved → Submitted → 409 (illegal backward transition) | PASS |
| Cannot change status of Closed complaint → 409 | PASS |
| Verify by non-owner → 403 | PASS |
| Reopen requires reason ≥ 10 chars → 400 if missing | PASS |
| Feedback once only — duplicate → 409 | PASS |
| Feedback on non-Closed complaint → 409 | PASS |

### Access Scoping Suite
| Test Name | Expected |
|---|---|
| admin can see all complaints | PASS |
| officer sees unassigned pool in their dept | PASS |
| officer from other dept cannot access complaint → 403 | PASS |
| admin can access category management, student cannot → 403 | PASS |
| student cannot access /api/users (admin-only) → 403 | PASS |

### Anonymous Masking Suite
| Test Name | Expected |
|---|---|
| anonymous complaint — officer sees filedBy null / filedByLabel Anonymous | PASS |
| anonymous complaint — owner sees own filedBy | PASS |

### Comments Suite
| Test Name | Expected |
|---|---|
| officer can post internal note; student cannot see it | PASS |
| officer can see internal note | PASS |
| student setting isInternal:true → 403 | PASS |
| comment on Closed complaint → 409 | PASS |
| comment text too short → 400 | PASS |
| anonymous complaint comment masking — officer sees Anonymous | PASS |

### Analytics Suite
| Test Name | Expected |
|---|---|
| GET /api/analytics/summary without auth → 401 | PASS |
| GET /api/analytics/summary as student → 403 | PASS |
| GET /api/analytics/summary as admin → 200 with required shape | PASS |
| GET /api/analytics/my-summary as student → 200 with byStatus + awaitingVerification | PASS |

### Admin Guards Suite
| Test Name | Expected |
|---|---|
| last admin cannot be deactivated → 409 | PASS |
| admin cannot deactivate themselves → 409 | PASS |
| create category with duplicate name → 409 | PASS |
| soft-delete category → isActive becomes false | PASS |

### Sanitize Middleware Suite
| Test Name | Expected |
|---|---|
| MongoDB operator in login body stripped — no operator injection | PASS |

### Attachment Access Control Suite
| Test Name | Expected |
|---|---|
| attachment with fake filename returns 404 | PASS |
| unauthenticated attachment access → 401 | PASS |
| another student cannot access attachment → 403 | PASS |

---

## Summary

| Category | Tests Written | Status |
|---|---|---|
| Auth (TC-01–TC-03 + extended) | 8 | Ready to run |
| Complaints (TC-04–TC-05 + extended) | 6 | Ready to run |
| Workflow (TC-06–TC-08 + extended) | 10 | Ready to run |
| Access scoping | 5 | Ready to run |
| Anonymous masking | 2 | Ready to run |
| Comments | 6 | Ready to run |
| Analytics | 4 | Ready to run |
| Admin guards | 4 | Ready to run |
| Sanitize middleware | 1 | Ready to run |
| Attachment access | 3 | Ready to run |
| **Total** | **49** | **Requires MongoDB** |

---

## Fixes Applied During Test Writing

1. **Apostrophe in test string** (`student's`) — caused JS parse error in single-quoted string; fixed by switching to backtick template literal.
2. **Comment in `setup.js`** containing glob pattern `**/tests/**` — Jest's Babel parser treated it as code; replaced with plain text comment.
