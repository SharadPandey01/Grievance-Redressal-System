const mongoose = require('mongoose');
const { COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH } = require('../constants');

const commentSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: [COMMENT_MIN_LENGTH, `Comment must be at least ${COMMENT_MIN_LENGTH} character`],
      maxlength: [COMMENT_MAX_LENGTH, `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`],
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
