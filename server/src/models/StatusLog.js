const mongoose = require('mongoose');
const { STATUSES } = require('../constants');

const statusLogSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: [...Object.values(STATUSES), null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: Object.values(STATUSES),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const StatusLog = mongoose.model('StatusLog', statusLogSchema);

module.exports = StatusLog;
