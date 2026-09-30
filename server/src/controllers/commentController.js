const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const commentService = require('../services/commentService');

/**
 * Load a complaint by ID with category populated (needed for assertCanView dept check).
 * Returns a plain JS object (lean).
 */
async function loadComplaint(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'Complaint not found');
  }
  const complaint = await Complaint.findById(id)
    .populate('category', 'department')
    .lean();
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }
  return complaint;
}

/**
 * GET /api/complaints/:id/comments
 * Returns comments in ascending order, filtered by access rules.
 */
const listComments = asyncHandler(async (req, res) => {
  const complaint = await loadComplaint(req.params.id);
  const comments = await commentService.listComments(req.user, complaint);
  return sendSuccess(res, comments);
});

/**
 * POST /api/complaints/:id/comments
 * Add a comment. Enforces Closed rejection, isInternal guard, and access check.
 */
const postComment = asyncHandler(async (req, res) => {
  const complaint = await loadComplaint(req.params.id);
  const comment = await commentService.postComment(req.user, complaint, req.body);
  return sendSuccess(res, comment, 201);
});

module.exports = { listComments, postComment };
