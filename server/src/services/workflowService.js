/**
 * workflowService.js
 *
 * ALL complaint state transitions flow through this single service.
 * Each mutating function uses an atomic findOneAndUpdate filtered on the
 * expected current status — if the document was changed concurrently,
 * the update returns null and we throw 409 instead of silently double-applying.
 */

const Complaint = require('../models/Complaint');
const StatusLog = require('../models/StatusLog');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES, COMPLAINANT_ROLES, STATUSES } = require('../constants');
const config = require('../config/env');
const logger = require('../utils/logger');

// Import shared helpers from complaintService.
// complaintService does NOT import workflowService, so there is no circular dependency.
const { toId, assertCanView } = require('./complaintService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Throw 409 with a standard message when the atomic update found no document
 * (meaning the status changed between our read and our write — race condition).
 */
function throwIfRace(updated) {
  if (!updated) {
    throw new ApiError(
      409,
      'The complaint was modified by another request. Please refresh and try again.'
    );
  }
}

// ─── Assign complaint ─────────────────────────────────────────────────────────

/**
 * Assign (or reassign) a complaint to an active officer.
 *
 * First assignment (status=Submitted) → promotes to Acknowledged.
 * Reassignment → keeps current status, logs a same-status entry.
 * Closed complaints cannot be reassigned.
 *
 * Role rules:
 *  - Officers: may assign to themselves or any active officer in their own dept.
 *  - Admins: may assign to any active officer.
 */
async function assignComplaint(user, complaintId, { assigneeId, note }) {
  // Populate category.department so assertCanView can check officer dept access
  const complaint = await Complaint.findById(complaintId)
    .populate('category', 'department')
    .lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');

  // Officers need visible access; admins always pass
  if (user.role !== ROLES.ADMIN) {
    assertCanView(user, complaint); // throws 403 if no access
  }

  if (complaint.status === STATUSES.CLOSED) {
    throw new ApiError(409, 'Closed complaints cannot be reassigned');
  }

  // Validate the target assignee
  const assignee = await User.findById(assigneeId);
  if (!assignee || !assignee.isActive || assignee.role !== ROLES.OFFICER) {
    throw new ApiError(400, 'Assignee must be an active officer');
  }

  // Officers can only assign within their own department
  if (user.role === ROLES.OFFICER && assignee.department !== user.department) {
    throw new ApiError(
      403,
      'Officers can only assign to officers in their own department'
    );
  }

  const currentStatus = complaint.status;
  const isFirstAssignment = currentStatus === STATUSES.SUBMITTED;

  // Build the update document
  const updateSet = { assignedTo: assigneeId };
  let toStatus = currentStatus; // default: stays the same for reassignment

  if (isFirstAssignment) {
    // First assignment promotes Submitted → Acknowledged
    updateSet.status = STATUSES.ACKNOWLEDGED;
    toStatus = STATUSES.ACKNOWLEDGED;
  }

  // Atomic: only applies if status hasn't changed since we read it
  const updated = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: currentStatus },
    { $set: updateSet },
    { returnDocument: 'after' }
  ).populate('category', 'name department').populate('assignedTo', 'name department').populate('filedBy', 'name');

  throwIfRace(updated);

  await StatusLog.create({
    complaint: complaintId,
    fromStatus: currentStatus,
    toStatus,
    changedBy: user._id,
    note: note || (isFirstAssignment ? 'Assigned to officer' : 'Complaint reassigned'),
  });

  return updated;
}

// ─── Change status ────────────────────────────────────────────────────────────

/**
 * Advance the complaint status via the officer/admin path.
 * Only two transitions are allowed here:
 *   Acknowledged → In Progress   (assigned officer or admin)
 *   In Progress  → Resolved      (assigned officer or admin; resolutionNotes required)
 */
async function changeStatus(user, complaintId, { toStatus, note, resolutionNotes }) {
  const complaint = await Complaint.findById(complaintId).lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');

  // Only the assigned officer or an admin may advance the status
  const isAssignedOfficer =
    complaint.assignedTo && toId(complaint.assignedTo) === user._id.toString();

  if (!isAssignedOfficer && user.role !== ROLES.ADMIN) {
    throw new ApiError(
      403,
      'Only the assigned officer or an admin can change the complaint status'
    );
  }

  const currentStatus = complaint.status;

  // Validate that this transition is legal for this endpoint
  const validTransitions = {
    [STATUSES.ACKNOWLEDGED]: STATUSES.IN_PROGRESS,
    [STATUSES.IN_PROGRESS]: STATUSES.RESOLVED,
  };

  if (validTransitions[currentStatus] !== toStatus) {
    throw new ApiError(
      409,
      `Cannot transition from '${currentStatus}' to '${toStatus}'. ` +
      `Expected: ${validTransitions[currentStatus] || 'no allowed transition from this status'}`
    );
  }

  const updateSet = { status: toStatus };

  if (toStatus === STATUSES.RESOLVED) {
    updateSet.resolutionNotes = resolutionNotes;
    updateSet.resolvedAt = new Date();
  }

  // Atomic update — filtered on expected current status
  const updated = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: currentStatus },
    { $set: updateSet },
    { returnDocument: 'after' }
  ).populate('category', 'name department').populate('assignedTo', 'name department').populate('filedBy', 'name');

  throwIfRace(updated);

  await StatusLog.create({
    complaint: complaintId,
    fromStatus: currentStatus,
    toStatus,
    changedBy: user._id,
    note,
  });

  return updated;
}

// ─── Verify and close ─────────────────────────────────────────────────────────

/**
 * Complainant confirms the resolution and closes the complaint.
 * Resolved → Closed. Sets closedAt.
 */
async function verifyAndClose(user, complaintId) {
  const complaint = await Complaint.findById(complaintId).lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');

  // Only the person who filed it can verify
  if (toId(complaint.filedBy) !== user._id.toString()) {
    throw new ApiError(403, 'Only the complainant can verify and close their own complaint');
  }

  if (complaint.status !== STATUSES.RESOLVED) {
    throw new ApiError(
      409,
      `Cannot verify a complaint with status '${complaint.status}'. It must be Resolved first.`
    );
  }

  const now = new Date();
  const updated = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: STATUSES.RESOLVED },
    { $set: { status: STATUSES.CLOSED, closedAt: now } },
    { returnDocument: 'after' }
  );

  throwIfRace(updated);

  await StatusLog.create({
    complaint: complaintId,
    fromStatus: STATUSES.RESOLVED,
    toStatus: STATUSES.CLOSED,
    changedBy: user._id,
    note: 'Complainant verified and closed the complaint',
  });

  return updated;
}

// ─── Reopen ───────────────────────────────────────────────────────────────────

/**
 * Complainant reopens a Resolved complaint (they are not satisfied).
 * Resolved → In Progress. Increments reopenCount, clears resolvedAt.
 */
async function reopen(user, complaintId, { reason }) {
  const complaint = await Complaint.findById(complaintId).lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (toId(complaint.filedBy) !== user._id.toString()) {
    throw new ApiError(403, 'Only the complainant can reopen their own complaint');
  }

  if (complaint.status !== STATUSES.RESOLVED) {
    throw new ApiError(
      409,
      `Cannot reopen a complaint with status '${complaint.status}'. It must be Resolved.`
    );
  }

  // $inc and $set can be combined in one update
  const updated = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: STATUSES.RESOLVED },
    {
      $set: { status: STATUSES.IN_PROGRESS, resolvedAt: null },
      $inc: { reopenCount: 1 },
    },
    { returnDocument: 'after' }
  );

  throwIfRace(updated);

  await StatusLog.create({
    complaint: complaintId,
    fromStatus: STATUSES.RESOLVED,
    toStatus: STATUSES.IN_PROGRESS,
    changedBy: user._id,
    // Store the reason in the log note so the audit trail is complete
    note: `Reopened by complainant: ${reason}`,
  });

  return updated;
}

// ─── Submit feedback ──────────────────────────────────────────────────────────

/**
 * Complainant submits a star rating and optional comment after the complaint is Closed.
 * One feedback per complaint — the unique index on Feedback.complaint enforces this;
 * a duplicate key error (code 11000) is caught by errorHandler as 409.
 */
async function submitFeedback(user, complaintId, { rating, comment }) {
  const complaint = await Complaint.findById(complaintId).lean();

  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (toId(complaint.filedBy) !== user._id.toString()) {
    throw new ApiError(403, 'Only the complainant can submit feedback');
  }

  if (complaint.status !== STATUSES.CLOSED) {
    throw new ApiError(
      409,
      `Feedback can only be submitted on Closed complaints (current status: ${complaint.status})`
    );
  }

  const feedback = await Feedback.create({
    complaint: complaintId,
    rating: parseInt(rating, 10),
    comment: comment || '',
    givenBy: user._id,
  });

  return feedback;
}

// ─── Auto-close ───────────────────────────────────────────────────────────────

/**
 * Close all Resolved complaints whose resolvedAt is older than AUTO_CLOSE_DAYS.
 * Called by the cron job and exported for direct use in tests.
 * Returns the number of complaints closed.
 */
async function autoCloseResolved() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.autoCloseDays);

  // Find candidates (lean — we only need the IDs and current status for the atomic update)
  const candidates = await Complaint.find({
    status: STATUSES.RESOLVED,
    resolvedAt: { $lt: cutoff },
  }).select('_id').lean();

  const now = new Date();
  let closedCount = 0;

  for (const { _id } of candidates) {
    // Atomic: only closes if still Resolved (no concurrent verify/reopen happened)
    const updated = await Complaint.findOneAndUpdate(
      { _id, status: STATUSES.RESOLVED },
      { $set: { status: STATUSES.CLOSED, closedAt: now } }
    );

    if (updated) {
      await StatusLog.create({
        complaint: _id,
        fromStatus: STATUSES.RESOLVED,
        toStatus: STATUSES.CLOSED,
        changedBy: null, // null = system action
        note: `Auto-closed after ${config.autoCloseDays} days without complainant response`,
      });
      closedCount++;
    }
  }

  return closedCount;
}

// ─── Allowed actions ─────────────────────────────────────────────────────────

/**
 * Compute which actions the requesting user can perform on a complaint right now.
 * The frontend should render action buttons purely from this output.
 *
 * @param {object} user         - req.user (Mongoose doc)
 * @param {object} complaint    - plain JS complaint (may have populated filedBy/assignedTo)
 * @param {boolean} feedbackExists - true if feedback has already been submitted
 * @returns {{ allowedActions: string[], allowedNextStatuses: string[] }}
 */
function getAllowedActions(user, complaint, feedbackExists) {
  const actions = [];
  const nextStatuses = [];
  const status = complaint.status;

  const isOwner =
    complaint.filedBy != null &&
    toId(complaint.filedBy) === user._id.toString();

  const isAssignedOfficer =
    complaint.assignedTo != null &&
    toId(complaint.assignedTo) === user._id.toString();

  // ── Assign / Reassign ────────────────────────────────────────────────────
  // Any officer or admin can assign, as long as the complaint is not Closed
  if (status !== STATUSES.CLOSED && (user.role === ROLES.OFFICER || user.role === ROLES.ADMIN)) {
    actions.push('assign');
  }

  // ── Update status ─────────────────────────────────────────────────────────
  // Only the assigned officer or an admin can advance via PATCH /status
  if (
    (isAssignedOfficer || user.role === ROLES.ADMIN) &&
    (status === STATUSES.ACKNOWLEDGED || status === STATUSES.IN_PROGRESS)
  ) {
    actions.push('updateStatus');
    if (status === STATUSES.ACKNOWLEDGED) nextStatuses.push(STATUSES.IN_PROGRESS);
    if (status === STATUSES.IN_PROGRESS) nextStatuses.push(STATUSES.RESOLVED);
  }

  // ── Verify (owner, Resolved) ──────────────────────────────────────────────
  if (isOwner && status === STATUSES.RESOLVED) {
    actions.push('verify');
  }

  // ── Reopen (owner, Resolved) ──────────────────────────────────────────────
  if (isOwner && status === STATUSES.RESOLVED) {
    actions.push('reopen');
  }

  // ── Feedback (owner, Closed, once) ────────────────────────────────────────
  if (isOwner && status === STATUSES.CLOSED && !feedbackExists) {
    actions.push('feedback');
  }

  return { allowedActions: actions, allowedNextStatuses: nextStatuses };
}

module.exports = {
  assignComplaint,
  changeStatus,
  verifyAndClose,
  reopen,
  submitFeedback,
  autoCloseResolved,
  getAllowedActions,
};
