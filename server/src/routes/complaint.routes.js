const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateBody } = require('../utils/validate');
const { validateCreateComplaint } = require('../validators/complaint.validators');
const {
  createComplaint,
  listComplaints,
  getComplaintById,
  downloadAttachment,
} = require('../controllers/complaintController');
const { COMPLAINANT_ROLES } = require('../constants');

// All complaint routes require authentication
router.use(authenticate);

// ── POST /api/complaints ────────────────────────────────────────────────────
// Only students and staff (complainants) can file complaints.
// Multer runs first so files are on disk before body validation touches them.
// upload.array('files', 3) handles 0-3 files under the field name "files".
router.post(
  '/',
  authorize(...COMPLAINANT_ROLES),
  upload.array('files', 3),
  validateBody(validateCreateComplaint),
  createComplaint
);

// ── GET /api/complaints ─────────────────────────────────────────────────────
// Any authenticated user; scoping is applied inside the service.
router.get('/', listComplaints);

// ── GET /api/complaints/:id ─────────────────────────────────────────────────
router.get('/:id', getComplaintById);

// ── GET /api/complaints/:id/attachments/:filename ───────────────────────────
// Must be defined after /:id so Express doesn't confuse the paths.
router.get('/:id/attachments/:filename', downloadAttachment);

module.exports = router;
