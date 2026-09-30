const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const workflowService = require('../services/workflowService');

/**
 * PATCH /api/complaints/:id/assign
 * Assign (or reassign) a complaint to an active officer.
 */
const assignComplaint = asyncHandler(async (req, res) => {
  const complaint = await workflowService.assignComplaint(
    req.user,
    req.params.id,
    req.body
  );
  return sendSuccess(res, complaint);
});

/**
 * PATCH /api/complaints/:id/status
 * Advance status: Acknowledged → In Progress, or In Progress → Resolved.
 */
const changeStatus = asyncHandler(async (req, res) => {
  const complaint = await workflowService.changeStatus(
    req.user,
    req.params.id,
    req.body
  );
  return sendSuccess(res, complaint);
});

/**
 * POST /api/complaints/:id/verify
 * Owner confirms resolution: Resolved → Closed.
 */
const verifyAndClose = asyncHandler(async (req, res) => {
  const complaint = await workflowService.verifyAndClose(req.user, req.params.id);
  return sendSuccess(res, complaint);
});

/**
 * POST /api/complaints/:id/reopen
 * Owner reopens a Resolved complaint: Resolved → In Progress.
 */
const reopen = asyncHandler(async (req, res) => {
  const complaint = await workflowService.reopen(req.user, req.params.id, req.body);
  return sendSuccess(res, complaint);
});

/**
 * POST /api/complaints/:id/feedback
 * Owner submits star rating + comment after Closed.
 */
const submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await workflowService.submitFeedback(
    req.user,
    req.params.id,
    req.body
  );
  return sendSuccess(res, feedback, 201);
});

module.exports = {
  assignComplaint,
  changeStatus,
  verifyAndClose,
  reopen,
  submitFeedback,
};
