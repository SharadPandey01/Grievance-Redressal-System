/**
 * Date and time formatting helpers built purely with native Date and Intl APIs.
 */

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'auto',
});

/**
 * Format a date string or Date object into "MMM DD, YYYY"
 * @param {string|Date|number} dateValue
 * @returns {string}
 */
export function formatDate(dateValue) {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormatter.format(d);
}

/**
 * Format a date string or Date object into "MMM DD, YYYY, HH:MM AM/PM"
 * @param {string|Date|number} dateValue
 * @returns {string}
 */
export function formatDateTime(dateValue) {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';
  return dateTimeFormatter.format(d);
}

/**
 * Format relative elapsed time (e.g. "just now", "2 hours ago", "in 3 days")
 * @param {string|Date|number} dateValue
 * @returns {string}
 */
export function timeAgo(dateValue) {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '—';

  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (Math.abs(diffSec) < 45) {
    return 'just now';
  }
  if (Math.abs(diffMin) < 60) {
    return relativeTimeFormatter.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return relativeTimeFormatter.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 30) {
    return relativeTimeFormatter.format(diffDay, 'day');
  }
  if (Math.abs(diffMonth) < 12) {
    return relativeTimeFormatter.format(diffMonth, 'month');
  }
  return relativeTimeFormatter.format(diffYear, 'year');
}

/**
 * Returns the absolute whole days between two dates
 * @param {string|Date|number} d1
 * @param {string|Date|number} d2
 * @returns {number}
 */
export function daysBetween(d1, d2 = new Date()) {
  if (!d1 || !d2) return 0;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  return Math.abs(Math.floor((utc2 - utc1) / msPerDay));
}

/**
 * Format bytes to human readable format (e.g. 245 KB, 1.8 MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getDaysOverdue(dueAt) {
  if (!dueAt) return 0;
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return 0;
  const diff = Date.now() - due;
  if (diff <= 0) return 0;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
