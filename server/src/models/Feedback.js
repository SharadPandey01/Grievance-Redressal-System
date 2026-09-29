const mongoose = require('mongoose');
const { FEEDBACK_RATING_MIN, FEEDBACK_RATING_MAX, FEEDBACK_COMMENT_MAX_LENGTH } = require('../constants');

const feedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [FEEDBACK_RATING_MIN, `Rating must be at least ${FEEDBACK_RATING_MIN}`],
      max: [FEEDBACK_RATING_MAX, `Rating cannot exceed ${FEEDBACK_RATING_MAX}`],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [FEEDBACK_COMMENT_MAX_LENGTH, `Comment cannot exceed ${FEEDBACK_COMMENT_MAX_LENGTH} characters`],
      default: '',
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
