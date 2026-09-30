const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const User = require('../models/User');
const StatusLog = require('../models/StatusLog');
const Feedback = require('../models/Feedback');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { ROLES, COMPLAINANT_ROLES, STATUSES, PRIORITIES } = require('../constants');
const config = require('../config/env');

// ─── ID extraction helper ─────────────────────────────────────────────────────

/**
 * Get the string ID from a field that may be either:
 *  - a raw ObjectId (when not populated), or
 *  - a populated sub-document { _id, name, ... }.
 * This prevents the classic bug where populated.toString() = "[object Object]".
 */
function toId(field) {
  if (!field) return null;
  // Populated documents have ._id; raw ObjectIds convert directly with .toString()
  return field._id ? field._id.toString() : field.toString();
}

// ─── Access helpers ──────────────────────────────────────────────────────────

/**
 * Returns true when the user is allowed to view the given complaint.
 * complaint must have category populated (at least category.department).
 */
function canView(user, complaint) {
  if (user.role === ROLES.ADMIN) return true;

  // The person who filed it always sees it
  if (toId(complaint.filedBy) === user._id.toString()) {
    return true;
  }

  if (user.role === ROLES.OFFICER) {
    // Assigned officer sees it
    if (complaint.assignedTo && toId(complaint.assignedTo) === user._id.toString()) {
      return true;
    }

    // Unassigned complaint in the officer's department
    const categoryDept =
      complaint.category && complaint.category.department
        ? complaint.category.department
        : null;

    if (!complaint.assignedTo && categoryDept === user.department) {
      return true;
    }
  }

  return false;
}

/**
 * Throws 403 if the user cannot view the complaint.
 * complaint must already have category populated.
 */
function assertCanView(user, complaint) {
  if (!canView(user, complaint)) {
    throw new ApiError(403, 'You do not have access to this complaint');
  }
}

// ─── Anonymous masking ───────────────────────────────────────────────────────

/**
 * Mutates a plain complaint object (from .lean()) to hide the filer's identity
 * when the complaint is anonymous AND the requester is not the owner.
 *   - Owner always sees their own name.
 *   - Officer/admin: filedBy → null, filedByLabel → "Anonymous".
 */
function applyFiledByMask(complaintObj, requestingUser) {
  const isOwner = toId(complaintObj.filedBy) === requestingUser._id.toString();

  if (isOwner) {
    delete complaintObj.filedByLabel;
    return;
  }

  if (complaintObj.isAnonymous) {
    complaintObj.filedBy = null;
    complaintObj.filedByLabel = 'Anonymous';
  }
}

// ─── Sort helper ─────────────────────────────────────────────────────────────

/**
 * Convert a sort string like "-createdAt" or "dueAt" into a Mongoose sort object.
 * Supported fields: createdAt, dueAt, priority.
 * Falls back to { createdAt: -1 } on unknown fields.
 */
function buildSort(sortParam) {
  const allowed = ['createdAt', 'dueAt', 'priority'];
  if (!sortParam) return { createdAt: -1 };

  const desc = sortParam.startsWith('-');
  const field = desc ? sortParam.slice(1) : sortParam;

  if (!allowed.includes(field)) return { createdAt: -1 };

  return { [field]: desc ? -1 : 1 };
}

// ─── Create complaint ────────────────────────────────────────────────────────

/**
 * Create a complaint, write the initial StatusLog, and auto-assign if the
 * category has an active defaultHandler officer.
 */
async function createComplaint(user, body, files) {
  // Priority field comes as a string from multipart; default to Medium
  const priority = body.priority || PRIORITIES.MEDIUM;

  // Validate category exists and is active
  const category = await Category.findById(body.category);
  if (!category || !category.isActive) {
    throw new ApiError(400, 'Category not found or inactive', [
      { field: 'category', message: 'Category not found or is inactive' },
    ]);
  }

  // isAnonymous comes as the string "true"/"false" from multipart — coerce it
  const isAnonymous = body.isAnonymous === 'true' || body.isAnonymous === true;

  // Build attachment metadata from multer's file objects
  const attachments = (files || []).map((f) => ({
    originalName: f.originalname,
    filename: f.filename,   // the random filename on disk
    mimetype: f.mimetype,
    size: f.size,
  }));

  // createWithCode sets code (GRV-YYYY-NNNN) and dueAt (based on SLA_DAYS)
  const complaint = await Complaint.createWithCode({
    title: body.title.trim(),
    description: body.description.trim(),
    category: category._id,
    priority,
    status: STATUSES.SUBMITTED,
    filedBy: user._id,   // always from req.user — never trust body
    isAnonymous,
    attachments,
  });

  // Initial StatusLog: null → Submitted (actor = the filer)
  await StatusLog.create({
    complaint: complaint._id,
    fromStatus: null,
    toStatus: STATUSES.SUBMITTED,
    changedBy: user._id,
    note: 'Complaint submitted',
  });

  // Auto-assign: if the category has an active defaultHandler officer, promote to Acknowledged
  if (category.defaultHandler) {
    const handler = await User.findById(category.defaultHandler);

    if (handler && handler.isActive && handler.role === ROLES.OFFICER) {
      complaint.assignedTo = handler._id;
      complaint.status = STATUSES.ACKNOWLEDGED;
      await complaint.save();

      // Second log: Submitted → Acknowledged, changedBy null = system
      await StatusLog.create({
        complaint: complaint._id,
        fromStatus: STATUSES.SUBMITTED,
        toStatus: STATUSES.ACKNOWLEDGED,
        changedBy: null,
        note: 'Auto-assigned by category default handler',
      });
    }
  }

  return complaint;
}

// ─── List complaints ─────────────────────────────────────────────────────────

/**
 * Return a paginated, role-scoped list of complaints with anonymous masking.
 */
async function listComplaints(user, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  // ── Role scoping ──────────────────────────────────────────────────────────
  if (COMPLAINANT_ROLES.includes(user.role)) {
    // Complainants only see complaints they filed
    filter.filedBy = user._id;
  } else if (user.role === ROLES.OFFICER) {
    const scope = query.scope || 'assigned';

    if (scope === 'assigned') {
      filter.assignedTo = user._id;
    } else if (scope === 'unassigned') {
      // Unassigned complaints whose category is in this officer's department
      const deptCats = await Category.find({
        department: user.department,
        isActive: true,
      }).select('_id');
      const catIds = deptCats.map((c) => c._id);
      filter.assignedTo = null;
      filter.category = { $in: catIds };
    } else {
      // scope=all: assigned to this officer OR unassigned in their department
      const deptCats = await Category.find({
        department: user.department,
        isActive: true,
      }).select('_id');
      const catIds = deptCats.map((c) => c._id);
      filter.$or = [
        { assignedTo: user._id },
        { assignedTo: null, category: { $in: catIds } },
      ];
    }
  }
  // Admin: no scope → sees everything

  // ── Status filter ─────────────────────────────────────────────────────────
  if (query.status && Object.values(STATUSES).includes(query.status)) {
    filter.status = query.status;
  }

  // ── Priority filter ───────────────────────────────────────────────────────
  if (query.priority && Object.values(PRIORITIES).includes(query.priority)) {
    filter.priority = query.priority;
  }

  // ── Category filter ───────────────────────────────────────────────────────
  // Note: for officer scope=unassigned, this overwrites the dept restriction
  // with the user's explicit choice — acceptable UX behaviour.
  if (query.category && !filter.category) {
    filter.category = query.category;
  }

  // ── AssignedTo filter ─────────────────────────────────────────────────────
  if (query.assignedTo && !filter.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  // ── Search: title or code, regex-safe ────────────────────────────────────
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    const searchConditions = [{ title: rx }, { code: rx }];

    if (filter.$or) {
      // Both the scope $or AND the search $or must hold → wrap in $and
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // ── Overdue filter ────────────────────────────────────────────────────────
  // dueAt is in the past AND status is not Resolved or Closed
  if (query.overdue === 'true') {
    filter.dueAt = { $lt: new Date() };
    // Overdue implies open; override any explicit status filter
    filter.status = { $nin: [STATUSES.RESOLVED, STATUSES.CLOSED] };
  }

  const sort = buildSort(query.sort);

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name department')
      .populate('assignedTo', 'name department')
      .populate('filedBy', 'name')
      .lean({ virtuals: true }),
    Complaint.countDocuments(filter),
  ]);

  // Apply anonymous masking on every item
  for (const c of complaints) {
    applyFiledByMask(c, user);
  }

  return { complaints, meta: buildMeta(page, limit, total) };
}

// ─── Get complaint by ID ──────────────────────────────────────────────────────

/**
 * Return full complaint detail with statusLogs, feedback, and anonymous masking.
 */
async function getComplaintById(user, id) {
  // Return 404 (not 500/400) for malformed IDs
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'Complaint not found');
  }

  const complaint = await Complaint.findById(id)
    .populate('category', 'name department')
    .populate('assignedTo', 'name department')
    .populate('filedBy', 'name')
    .lean({ virtuals: true });

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  // Access check: 403 if the user is not allowed to see this complaint
  assertCanView(user, complaint);

  // Fetch status history (oldest first) with actor details
  const statusLogs = await StatusLog.find({ complaint: id })
    .sort({ timestamp: 1 })
    .populate('changedBy', 'name role')
    .lean();

  // Replace null changedBy with a "System" sentinel for the frontend
  for (const log of statusLogs) {
    if (!log.changedBy) {
      log.changedBy = { name: 'System', role: null };
    }
  }

  const feedback = await Feedback.findOne({ complaint: id }).lean();

  applyFiledByMask(complaint, user);

  // Lazy import to avoid circular dependency (workflowService imports from this file)
  const { getAllowedActions } = require('./workflowService');
  const { allowedActions, allowedNextStatuses } = getAllowedActions(user, complaint, !!feedback);

  return { ...complaint, statusLogs, feedback: feedback || null, allowedActions, allowedNextStatuses };
}

// ─── Attachment access ────────────────────────────────────────────────────────

/**
 * Verify that the user may access the complaint, then resolve the absolute
 * file path for an attachment.  Returns { filePath, mimetype, originalName }.
 */
async function resolveAttachment(user, complaintId, filename) {
  if (!mongoose.Types.ObjectId.isValid(complaintId)) {
    throw new ApiError(404, 'Complaint not found');
  }

  // Only category.department is needed for the canView department check
  const complaint = await Complaint.findById(complaintId)
    .populate('category', 'department')
    .lean();

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  assertCanView(user, complaint);

  // Verify the filename belongs to this complaint — prevents path traversal
  const attachment = complaint.attachments.find((a) => a.filename === filename);
  if (!attachment) {
    throw new ApiError(404, 'Attachment not found on this complaint');
  }

  // Build an absolute path so res.sendFile works without a `root` option
  const filePath = path.resolve(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Attachment file not found on disk');
  }

  return {
    filePath,                        // absolute — safe to pass to res.sendFile
    mimetype: attachment.mimetype,
    originalName: attachment.originalName,
  };
}

module.exports = {
  toId,           // exported for workflowService (avoids duplicating the helper)
  assertCanView,  // exported for workflowService
  createComplaint,
  listComplaints,
  getComplaintById,
  resolveAttachment,
};
