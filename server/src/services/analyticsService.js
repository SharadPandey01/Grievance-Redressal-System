/**
 * analyticsService.js
 *
 * MongoDB aggregation-powered analytics.
 * All gaps (missing months, zero-count statuses/priorities) are filled
 * so charts never receive sparse data.
 */

const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const Feedback = require('../models/Feedback');
const { STATUSES, PRIORITIES, COMPLAINANT_ROLES, ROLES } = require('../constants');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return an array of YYYY-MM strings for the last N months (oldest first). */
function lastNMonths(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  }
  return result;
}

/** Convert an aggregate [{_id, count}] array to a plain { label: count } map. */
function toMap(arr, idKey = '_id') {
  const map = {};
  for (const item of arr) map[item[idKey] || item._id] = item.count;
  return map;
}

// ─── Admin global summary ─────────────────────────────────────────────────────

/**
 * Full analytics summary — admin only.
 * Returns:
 *  totals, byStatus, byCategory, byDepartment, byPriority,
 *  monthlyTrend, avgResolutionHours, avgRating, reopenRate
 */
async function getSummary() {
  // Start of 6-month window
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const openStatuses = [STATUSES.SUBMITTED, STATUSES.ACKNOWLEDGED, STATUSES.IN_PROGRESS];

  // Run independent aggregations concurrently
  const [
    statusAgg,
    overdueCount,
    categoryAgg,
    departmentAgg,
    priorityAgg,
    createdByMonthAgg,
    resolvedByMonthAgg,
    avgResAgg,
    avgRatingAgg,
    totalCount,
    reopenedCount,
  ] = await Promise.all([
    // Counts by status
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Overdue: dueAt < now AND status is open
    Complaint.countDocuments({
      status: { $in: openStatuses },
      dueAt: { $lt: new Date() },
    }),

    // Counts by category name
    Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ['$cat.name', 'Uncategorised'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),

    // Counts by category department
    Complaint.aggregate([
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.department', count: { $sum: 1 } } },
      { $project: { _id: 0, department: { $ifNull: ['$_id', 'Unknown'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),

    // Counts by priority
    Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),

    // Created per month (last 6 months)
    Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      }},
    ]),

    // Resolved per month by resolvedAt (last 6 months)
    Complaint.aggregate([
      { $match: { resolvedAt: { $gte: sixMonthsAgo, $ne: null } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$resolvedAt' } },
        count: { $sum: 1 },
      }},
    ]),

    // Average resolution time in hours (createdAt → resolvedAt)
    Complaint.aggregate([
      { $match: { status: { $in: [STATUSES.RESOLVED, STATUSES.CLOSED] }, resolvedAt: { $ne: null } } },
      { $project: {
        diffHours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
      }},
      { $group: { _id: null, avg: { $avg: '$diffHours' } } },
    ]),

    // Average feedback rating
    Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),

    // Total complaint count
    Complaint.countDocuments(),

    // Complaints that were ever reopened
    Complaint.countDocuments({ reopenCount: { $gt: 0 } }),
  ]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const statusMap = toMap(statusAgg);
  const allCount = Object.values(statusMap).reduce((s, v) => s + v, 0);
  const totals = {
    all: allCount,
    open: openStatuses.reduce((s, st) => s + (statusMap[st] || 0), 0),
    resolved: statusMap[STATUSES.RESOLVED] || 0,
    closed:   statusMap[STATUSES.CLOSED]   || 0,
    overdue:  overdueCount,
  };

  // ── byStatus — fill all statuses with 0 ──────────────────────────────────
  const byStatus = Object.values(STATUSES).map(s => ({
    status: s,
    count: statusMap[s] || 0,
  }));

  // ── byPriority — fill all priorities with 0 ──────────────────────────────
  const priorityMap = toMap(priorityAgg);
  const byPriority = Object.values(PRIORITIES).map(p => ({
    priority: p,
    count: priorityMap[p] || 0,
  }));

  // ── monthlyTrend — fill all 6 months with 0 ──────────────────────────────
  const createdMap  = toMap(createdByMonthAgg);
  const resolvedMap = toMap(resolvedByMonthAgg);
  const monthlyTrend = lastNMonths(6).map(month => ({
    month,
    created:  createdMap[month]  || 0,
    resolved: resolvedMap[month] || 0,
  }));

  // ── Derived scalars ───────────────────────────────────────────────────────
  const avgResolutionHours = avgResAgg[0]?.avg
    ? Math.round(avgResAgg[0].avg * 10) / 10
    : 0;

  const avgRating = avgRatingAgg[0]?.avg
    ? Math.round(avgRatingAgg[0].avg * 10) / 10
    : 0;

  const reopenRate = totalCount > 0
    ? Math.round((reopenedCount / totalCount) * 1000) / 10  // one decimal %
    : 0;

  return {
    totals,
    byStatus,
    byCategory: categoryAgg,
    byDepartment: departmentAgg,
    byPriority,
    monthlyTrend,
    avgResolutionHours,
    avgRating,
    reopenRate,
  };
}

// ─── Role-aware personal summary ─────────────────────────────────────────────

/**
 * Personalised summary for the authenticated user.
 *
 * Complainant (student|staff):
 *   { byStatus, awaitingVerification }
 *
 * Officer:
 *   { byStatus (assigned complaints), overdue, unassignedPool }
 *
 * Admin:
 *   { byStatus (global), awaitingVerification (global Resolved count) }
 */
async function getMySummary(user) {
  if (COMPLAINANT_ROLES.includes(user.role)) {
    return complainantSummary(user);
  }
  if (user.role === ROLES.OFFICER) {
    return officerSummary(user);
  }
  // Admin
  return adminMySummary();
}

async function complainantSummary(user) {
  const agg = await Complaint.aggregate([
    { $match: { filedBy: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = toMap(agg);

  const byStatus = Object.values(STATUSES).map(s => ({
    status: s,
    count: map[s] || 0,
  }));

  return {
    byStatus,
    awaitingVerification: map[STATUSES.RESOLVED] || 0,
  };
}

async function officerSummary(user) {
  // Assigned complaints by status
  const agg = await Complaint.aggregate([
    { $match: { assignedTo: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = toMap(agg);
  const byStatus = Object.values(STATUSES).map(s => ({
    status: s,
    count: map[s] || 0,
  }));

  // Overdue assigned complaints
  const overdue = await Complaint.countDocuments({
    assignedTo: user._id,
    status: { $in: [STATUSES.SUBMITTED, STATUSES.ACKNOWLEDGED, STATUSES.IN_PROGRESS] },
    dueAt: { $lt: new Date() },
  });

  // Unassigned pool in officer's department (open only)
  const deptCats = await Category.find({
    department: user.department,
    isActive: true,
  }).select('_id');
  const catIds = deptCats.map(c => c._id);
  const unassignedPool = await Complaint.countDocuments({
    assignedTo: null,
    category: { $in: catIds },
    status: { $in: [STATUSES.SUBMITTED, STATUSES.ACKNOWLEDGED, STATUSES.IN_PROGRESS] },
  });

  return { byStatus, overdue, unassignedPool };
}

async function adminMySummary() {
  const agg = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = toMap(agg);
  const byStatus = Object.values(STATUSES).map(s => ({
    status: s,
    count: map[s] || 0,
  }));

  return {
    byStatus,
    awaitingVerification: map[STATUSES.RESOLVED] || 0,
  };
}

module.exports = { getSummary, getMySummary };
