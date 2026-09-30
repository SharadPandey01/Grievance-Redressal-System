/**
 * commentService.js
 *
 * Business logic for the complaint comment thread.
 * Rules enforced here (never in the controller):
 *  - assertCanView gates read AND write access
 *  - Closed complaints reject new comments (409)
 *  - isInternal can only be set by officer or admin; complainants who attempt it get 403
 *  - Anonymous masking: a complainant's own comments show as "Anonymous" to non-owners
 */

const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { ROLES, COMPLAINANT_ROLES, STATUSES } = require('../constants');
const { toId, assertCanView } = require('./complaintService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Apply anonymous masking to a single comment object (plain JS from .lean()).
 * If the parent complaint is anonymous AND the comment author is the complainant
 * AND the requester is not the complainant owner → replace name with "Anonymous".
 *
 * @param {object} comment       - plain comment object (author must be populated)
 * @param {object} complaint     - plain complaint object
 * @param {object} requestingUser - req.user
 */
function maskCommentAuthor(comment, complaint, requestingUser) {
  const isComplaintAnonymous = complaint.isAnonymous;
  if (!isComplaintAnonymous) return; // nothing to mask

  const complaintOwnerId = toId(complaint.filedBy);
  const commentAuthorId  = toId(comment.author);
  const requesterId      = requestingUser._id.toString();

  // The comment was written by the owner of the complaint
  const authorIsOwner = commentAuthorId === complaintOwnerId;
  // The requester is the owner seeing their own thread
  const requesterIsOwner = requesterId === complaintOwnerId;

  if (authorIsOwner && !requesterIsOwner) {
    // Hide the owner's identity from everyone else
    comment.author = { _id: comment.author._id, name: 'Anonymous', role: comment.author.role };
  }
}

// ─── List comments ────────────────────────────────────────────────────────────

/**
 * Return comments on a complaint in ascending chronological order.
 *  - Uses assertCanView so access rules match GET /complaints/:id
 *  - Complainants never receive internal (isInternal=true) comments
 *  - Anonymous masking applied per comment
 */
async function listComments(user, complaint) {
  // complaint already loaded and access-checked by controller (pass the lean doc)
  assertCanView(user, complaint);

  const isComplainant = COMPLAINANT_ROLES.includes(user.role);

  // Build the query filter — complainants never see internal notes
  const filter = { complaint: complaint._id };
  if (isComplainant) {
    filter.isInternal = false;
  }

  const comments = await Comment.find(filter)
    .sort({ createdAt: 1 })
    .populate('author', 'name role')
    .lean();

  // Apply anonymous masking on each comment
  for (const c of comments) {
    maskCommentAuthor(c, complaint, user);
  }

  return comments;
}

// ─── Post comment ─────────────────────────────────────────────────────────────

/**
 * Add a comment to a complaint.
 *  - Closed complaints → 409
 *  - isInternal=true from a complainant → 403
 */
async function postComment(user, complaint, { text, isInternal }) {
  assertCanView(user, complaint);

  if (complaint.status === STATUSES.CLOSED) {
    throw new ApiError(409, 'Cannot add a comment to a Closed complaint');
  }

  const isComplainant = COMPLAINANT_ROLES.includes(user.role);

  // Internal notes are officer/admin only
  if (isInternal && isComplainant) {
    throw new ApiError(403, 'Complainants cannot post internal notes');
  }

  const comment = await Comment.create({
    complaint: complaint._id,
    author: user._id,
    text: text.trim(),
    isInternal: isComplainant ? false : !!isInternal,
  });

  // Return populated so the response mirrors the list format
  await comment.populate('author', 'name role');
  return comment;
}

module.exports = { listComments, postComment };
