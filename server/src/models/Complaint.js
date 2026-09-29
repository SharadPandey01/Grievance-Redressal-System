const mongoose = require('mongoose');
const { STATUSES, PRIORITIES, SLA_DAYS } = require('../constants');

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITIES),
      default: PRIORITIES.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.SUBMITTED,
    },
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    dueAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reopenCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

complaintSchema.virtual('isOverdue').get(function () {
  if (!this.dueAt) return false;
  const terminalStatuses = [STATUSES.RESOLVED, STATUSES.CLOSED];
  if (terminalStatuses.includes(this.status)) return false;
  return new Date() > this.dueAt;
});

complaintSchema.index({ filedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ dueAt: 1 });

complaintSchema.statics.createWithCode = async function (data) {
  const codeGenerator = require('../services/codeGenerator');
  const code = await codeGenerator.nextComplaintCode();

  const slaDays = SLA_DAYS[data.priority] || SLA_DAYS[PRIORITIES.MEDIUM];
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + slaDays);

  return this.create({ ...data, code, dueAt });
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
