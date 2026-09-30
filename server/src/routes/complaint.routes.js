const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateBody } = require('../utils/validate');
const { validateCreateComplaint } = require('../validators/complaint.validators');
const {
  validateAssign,
  validateChangeStatus,
  validateReopen,
  validateFeedback,
} = require('../validators/workflow.validators');
const {
  createComplaint,
  listComplaints,
  getComplaintById,
  downloadAttachment,
} = require('../controllers/complaintController');
const {
  assignComplaint,
  changeStatus,
  verifyAndClose,
  reopen,
  submitFeedback,
} = require('../controllers/workflowController');
const { COMPLAINANT_ROLES } = require('../constants');

// All complaint routes require authentication
router.use(authenticate);

// ── POST /api/complaints ─────────────────────────────────────────────────────
// Complainants only. Multer runs before body validation so files are on disk first.
router.post(
  '/',
  authorize(...COMPLAINANT_ROLES),
  upload.array('files', 3),
  validateBody(validateCreateComplaint),
  createComplaint
);

// ── GET /api/complaints ──────────────────────────────────────────────────────
router.get('/', listComplaints);

// ── PATCH /api/complaints/:id/assign ────────────────────────────────────────
router.patch(
  '/:id/assign',
  authorize('officer', 'admin'),
  validateBody(validateAssign),
  assignComplaint
);

// ── PATCH /api/complaints/:id/status ────────────────────────────────────────
// No authorize() here — the service enforces "assigned officer or admin"
router.patch(
  '/:id/status',
  validateBody(validateChangeStatus),
  changeStatus
);

// ── POST /api/complaints/:id/verify ─────────────────────────────────────────
// No authorize() — service enforces owner-only
router.post('/:id/verify', verifyAndClose);

// ── POST /api/complaints/:id/reopen ─────────────────────────────────────────
router.post(
  '/:id/reopen',
  validateBody(validateReopen),
  reopen
);

// ── POST /api/complaints/:id/feedback ───────────────────────────────────────
router.post(
  '/:id/feedback',
  validateBody(validateFeedback),
  submitFeedback
);

// ── GET /api/complaints/:id ──────────────────────────────────────────────────
// Must come after all /:id/<action> routes so Express matches specific paths first
router.get('/:id', getComplaintById);

// ── GET /api/complaints/:id/attachments/:filename ───────────────────────────
router.get('/:id/attachments/:filename', downloadAttachment);

module.exports = router;

