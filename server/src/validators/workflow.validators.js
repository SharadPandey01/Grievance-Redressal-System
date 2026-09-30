const { hasLength, isValidObjectId, isOneOf } = require('../utils/validate');
const { STATUSES, FEEDBACK_RATING_MIN, FEEDBACK_RATING_MAX, FEEDBACK_COMMENT_MAX_LENGTH } = require('../constants');

/**
 * Validate PATCH /api/complaints/:id/assign body.
 */
function validateAssign(body) {
  const errors = [];

  if (!body.assigneeId || !isValidObjectId(body.assigneeId)) {
    errors.push({ field: 'assigneeId', message: 'A valid assignee user ID is required' });
  }

  // note is optional but must be a string if provided
  if (body.note !== undefined && typeof body.note !== 'string') {
    errors.push({ field: 'note', message: 'Note must be a string' });
  }

  return errors;
}

/**
 * Validate PATCH /api/complaints/:id/status body.
 * Only Acknowledged→In Progress and In Progress→Resolved are allowed via this endpoint.
 */
function validateChangeStatus(body) {
  const errors = [];

  // Only the two statuses reachable through this endpoint are valid toStatus values
  const validTargets = [STATUSES.IN_PROGRESS, STATUSES.RESOLVED];
  if (!body.toStatus || !isOneOf(body.toStatus, validTargets)) {
    errors.push({
      field: 'toStatus',
      message: `toStatus must be one of: ${validTargets.join(', ')}`,
    });
  }

  if (!hasLength(body.note, 3, 500)) {
    errors.push({ field: 'note', message: 'Note must be between 3 and 500 characters' });
  }

  // resolutionNotes is required when the complaint is being Resolved
  if (body.toStatus === STATUSES.RESOLVED && !hasLength(body.resolutionNotes, 1, 2000)) {
    errors.push({
      field: 'resolutionNotes',
      message: 'Resolution notes are required (1–2000 characters) when resolving a complaint',
    });
  }

  return errors;
}

/**
 * Validate POST /api/complaints/:id/reopen body.
 */
function validateReopen(body) {
  const errors = [];

  if (!hasLength(body.reason, 10, 500)) {
    errors.push({ field: 'reason', message: 'Reason must be between 10 and 500 characters' });
  }

  return errors;
}

/**
 * Validate POST /api/complaints/:id/feedback body.
 */
function validateFeedback(body) {
  const errors = [];

  const rating = parseInt(body.rating, 10);
  if (isNaN(rating) || rating < FEEDBACK_RATING_MIN || rating > FEEDBACK_RATING_MAX) {
    errors.push({
      field: 'rating',
      message: `Rating must be an integer between ${FEEDBACK_RATING_MIN} and ${FEEDBACK_RATING_MAX}`,
    });
  }

  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string' || body.comment.length > FEEDBACK_COMMENT_MAX_LENGTH) {
      errors.push({
        field: 'comment',
        message: `Comment must be a string with at most ${FEEDBACK_COMMENT_MAX_LENGTH} characters`,
      });
    }
  }

  return errors;
}

module.exports = {
  validateAssign,
  validateChangeStatus,
  validateReopen,
  validateFeedback,
};
