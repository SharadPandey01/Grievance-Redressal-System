# Campus Grievance System — Client

The frontend client for the Campus Complaint and Grievance Redressal System, built with **React 18**, **Vite**, and **Tailwind CSS**.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Backend running at `http://localhost:5000`

### Installation & Run

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run Oxlint linting check
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

The application runs on `http://localhost:5173` by default and proxies `/api` requests to `http://localhost:5000/api`.

---

## Role Portals & Routes

All routes are secured by `<ProtectedRoute>` and role-specific `<RoleRoute>` guards:

| Path | Allowed Roles | Description |
|---|---|---|
| `/login` | Public (guest only) | User authentication |
| `/register` | Public (guest only) | Account creation for students and staff |
| `/dashboard` | Student, Staff | Complainant grievance dashboard & status metrics |
| `/complaints/new` | Student, Staff | Complaint filing form with attachments & anonymous toggle |
| `/complaints/:id` | All authenticated (with access) | Full complaint detail, audit timeline, comments, actions |
| `/officer` | Officer | Department triage queue, unassigned pool claim, overdue alerts |
| `/admin` | Admin | Campus analytics dashboard with Recharts KPIs and trends |
| `/admin/complaints` | Admin | Complaints repository with filters, reassign modal, and CSV export |
| `/admin/categories` | Admin | Category master data & default officer handler routing |
| `/admin/users` | Admin | User provisioning & account permissions |
| `/profile` | All authenticated | Personal profile editing & password updates |
| `/403` | Public | Unauthorized access error page |

---

## State & Architecture Guidelines

- **Zero Heavy UI Libraries**: All UI elements (`Button`, `Modal`, `Tabs`, `Toggle`, `Badge`, `ConfirmDialog`, `Pagination`) are built from scratch using pure Tailwind CSS utility classes and Lucide React icons.
- **Data Fetching via `useFetch`**: Custom hook supporting cancellation flags, background polling (`pollMs: 30000`), and automatic refresh upon tab focus.
- **Workflow Permissions**: Action buttons on `/complaints/:id` are driven strictly by the backend's `allowedActions` and `allowedNextStatuses` fields.
- **URL Synchronization**: Table filters, search terms, tabs, and pagination sync bidirectionally with `useSearchParams` to ensure shareable, refresh-resilient state.
