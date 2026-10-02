/**
 * Shared constants and color mappings for statuses, priorities, and roles.
 */

export const STATUSES = [
  'Submitted',
  'Acknowledged',
  'In Progress',
  'Resolved',
  'Closed',
];

export const STATUS = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const PRIORITIES = ['Low', 'Medium', 'High'];

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const ROLES = ['student', 'staff', 'officer', 'admin'];

export const ROLE = {
  STUDENT: 'student',
  STAFF: 'staff',
  OFFICER: 'officer',
  ADMIN: 'admin',
};

export const COMPLAINANT_ROLES = ['student', 'staff'];

/**
 * Tailwind badge and accent colour classes for statuses
 */
export const STATUS_COLORS = {
  Submitted: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  Acknowledged: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  'In Progress': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  Resolved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Closed: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

/**
 * Tailwind badge and accent colour classes for priorities
 */
export const PRIORITY_COLORS = {
  Low: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'text-slate-500',
  },
  Medium: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'text-amber-600',
  },
  High: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'text-rose-600',
  },
};

export const ROLE_LABELS = {
  student: 'Student',
  staff: 'Staff',
  officer: 'Grievance Officer',
  admin: 'Administrator',
};
