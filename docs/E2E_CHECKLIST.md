# End-to-End QA Test Checklist & Verification Script

This document details the complete end-to-end verification script for the **Campus Complaint and Grievance Redressal System**, covering the blueprint scenarios (TC-01 through TC-08) and extended system workflows.

---

## Test Execution Summary

| Test ID | Test Scenario | Actor / Role | Status | Notes |
|---|---|---|---|---|
| **TC-01** | User Authentication & Registration (Student/Staff) | Student / Staff | **PASS** | Domain check, hashed passwords, JWT token issued |
| **TC-02** | Invalid Login & Wrong Credentials | Public | **PASS** | Generic error prevented email enumeration |
| **TC-03** | Route Protection & RBAC Guards (403/404) | Student / Officer | **PASS** | Forbidden page rendered on role mismatch |
| **TC-04** | File Complaint (Standard, Anonymous, Attachments) | Student | **PASS** | Validated fields, SLA computed, masked filer |
| **TC-05** | Officer Queue, Triage & Assignment | Officer | **PASS** | Scoped to Hostel dept, unassigned pool claim |
| **TC-06** | Grievance Lifecycle State Machine | Officer & Student | **PASS** | Acknowledged → In Progress → Resolved → Closed |
| **TC-07** | Discussion Thread & Confidential Notes | Officer & Student | **PASS** | `isInternal` notes hidden from complainant |
| **TC-08** | Verification, Reopen Flow & Complainant Feedback | Student | **PASS** | Star rating recorded, reopen counter incremented |
| **TC-09** | Admin Master Data (Categories & Officers) | Admin | **PASS** | Category created with default auto-assign officer |
| **TC-10** | Admin User Provisioning & Self-Action Guards | Admin | **PASS** | Protected last admin and self-deactivation |
| **TC-11** | Admin Global Analytics & Recharts Visualizations | Admin | **PASS** | Donut, trend line, category/dept bars rendered |
| **TC-12** | Complaints Repository & Hand-Built CSV Export | Admin | **PASS** | Filtered dataset exported and downloaded via Blob |

---

## Blueprint Scenarios (TC-01 to TC-08)

### TC-01: User Registration and Authentication
- **Objective**: Verify that students and staff can register with campus credentials and log into their accounts.
- **Steps**:
  1. Navigate to `/register`.
  2. Register a new user: Name `Alex Rivera`, Email `alex.rivera@campus.edu`, Role `Student`, Password `Password@123`.
  3. Submit the form; verify redirection to dashboard or login with success toast.
  4. Log in using `alex.rivera@campus.edu` and `Password@123`.
- **Expected Result**: JWT returned and saved in `localStorage`; user redirected to `/dashboard` with student greeting.
- **Actual Result**: **PASS**. Profile data populated in top navbar; auth state persisted across refreshes.

### TC-02: Invalid Login & Wrong Password
- **Objective**: Ensure the system rejects invalid credentials without revealing user existence.
- **Steps**:
  1. Navigate to `/login`.
  2. Enter `student1@campus.edu` with incorrect password `WrongPassword!`.
  3. Submit form.
- **Expected Result**: HTTP 401 with generic error: "Invalid credentials". No distinction between invalid email and invalid password.
- **Actual Result**: **PASS**. Toast and inline error showed generic message; login blocked.

### TC-03: Route Guards & RBAC Access Control
- **Objective**: Verify that unauthorized roles cannot view protected portal routes.
- **Steps**:
  1. Log in as `student1@campus.edu`.
  2. Manually navigate URL to `http://localhost:5173/admin` and `http://localhost:5173/officer`.
- **Expected Result**: Redirection to `/403` Forbidden page with clear message and "Go back to dashboard" button.
- **Actual Result**: **PASS**. `RoleRoute` blocked access and showed custom 403 page.

### TC-04: Filing Grievances (Standard, Anonymous, Attachments)
- **Objective**: Test grievance intake validation, file attachment constraints, and anonymous identity concealment.
- **Steps**:
  1. As `student1@campus.edu`, navigate to `/complaints/new`.
  2. Attempt submitting empty form: verify field-level validation errors.
  3. Enter Title: "Water leakage in Room 302", Description: "Continuous water seepage from ceiling damaging electrical switchboard", Priority: "High", Category: "Hostel & Mess".
  4. Toggle "Submit Anonymously" to active.
  5. Upload an image (`.jpg` or `.png`) under 5 MB.
  6. Submit grievance.
- **Expected Result**: Generated code `GRV-YYYY-NNNN`, SLA calculated (`High` = 2 days), success confirmation screen with copyable code.
- **Actual Result**: **PASS**. Reference code generated; filer name marked anonymous for officers and admins.

### TC-05: Officer Queue Scoping & Department Triage
- **Objective**: Verify department isolation for grievance officers and pool claim workflow.
- **Steps**:
  1. Log in as `officer.hostel@campus.edu`.
  2. Navigate to `/officer`.
  3. Inspect stat cards (Assigned, In Progress, Overdue SLA, Unassigned Pool).
  4. Switch to "Unassigned (Hostel)" tab.
  5. Click "Assign to me" on an unassigned complaint; confirm modal prompt.
- **Expected Result**: Ticket transitions from `Submitted` to `Acknowledged`, is removed from unassigned pool, and appears in "Assigned to me".
- **Actual Result**: **PASS**. Ticket state updated in place and stats incremented.

### TC-06: Grievance Lifecycle State Machine
- **Objective**: Verify strict state transition rules: `Acknowledged` → `In Progress` → `Resolved` → `Closed`.
- **Steps**:
  1. In `/complaints/:id` as assigned officer, click "Mark In Progress".
  2. Provide investigation note and submit.
  3. Click "Resolve Grievance", provide mandatory resolution summary and investigation notes.
  4. Attempt resolving without resolution notes to verify required validation.
- **Expected Result**: Transitions succeed; illegal transitions prohibited by server with 409 status; timeline logs updated with actor attribution.
- **Actual Result**: **PASS**. Status transitioned smoothly; resolution notes displayed in green callout banner.

### TC-07: Discussion Thread & Confidential Notes
- **Objective**: Verify comment thread visibility and officer confidential notes.
- **Steps**:
  1. As officer on `/complaints/:id`, post an internal note with "Internal note (officers only)" checked.
  2. Post a public comment visible to complainant.
  3. Log in as complainant (`student1@campus.edu`) and view the same ticket.
- **Expected Result**: Public comment visible to complainant; internal note completely omitted from response and UI.
- **Actual Result**: **PASS**. Backend filtered out internal notes for non-officers; amber internal badge shown to officer.

### TC-08: Resolution Verification, Reopen, and Star Rating
- **Objective**: Test complainant verification, reopening within SLA, and feedback submission.
- **Steps**:
  1. As complainant on a `Resolved` ticket, click "Reopen".
  2. Enter explanation reason (min 10 chars) and submit. Verify status returns to `In Progress` and reopen counter increments.
  3. Re-resolve ticket as officer.
  4. As complainant, click "Verify & Close".
  5. In feedback modal, select 5 stars and optional review comment.
- **Expected Result**: Complaint marked terminal `Closed`. Star rating and comment displayed on ticket overview.
- **Actual Result**: **PASS**. Comments locked after closing; feedback persisted.

---

## Administrative Capabilities (TC-09 to TC-12)

### TC-09: Category Management & Automated Routing
- **Steps**: Admin logs in, creates a new category "Network Infrastructure" under department "IT Support", selects `officer.it@campus.edu` as default handler. Student files complaint under this category.
- **Expected Result**: Complaint is immediately auto-assigned to IT officer upon submission and placed in `Acknowledged`.
- **Actual Result**: **PASS**. Auto-assignment executed without manual triage.

### TC-10: User Management & Safety Guards
- **Steps**: Admin attempts to deactivate own account or demote self from admin. Admin creates new officer with temporary password.
- **Expected Result**: Self-deactivation and self-demotion disabled in UI; server throws 409 conflict if bypassed. New officer created with generated password.
- **Actual Result**: **PASS**. Safety guards enforced both client-side and server-side.

### TC-11: Global Analytics & Visualizations
- **Steps**: Admin visits `/admin`.
- **Expected Result**: 6 KPI cards load actual counts. 5 Recharts visualizations render without errors. Overdue complaints list displays top 5 SLA-breached tickets.
- **Actual Result**: **PASS**. Fluid chart resizing with tooltip interaction and color consistency.

### TC-12: Complaints Repository & CSV Export
- **Steps**: Admin visits `/admin/complaints`, filters by `Status: In Progress` and `Priority: High`, and clicks "Export CSV".
- **Expected Result**: Blob file `campus_complaints_YYYY-MM-DD.csv` downloads with proper headers and escaped string fields.
- **Actual Result**: **PASS**. CSV exported and verified in spreadsheet viewer.
