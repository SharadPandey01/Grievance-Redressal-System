const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getSummary, getMySummary } = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(authenticate);

// ── GET /api/analytics/summary ───────────────────────────────────────────────
// Admin only: global aggregated metrics
router.get('/summary', authorize('admin'), getSummary);

// ── GET /api/analytics/my-summary ───────────────────────────────────────────
// Any authenticated user: role-aware personal metrics
router.get('/my-summary', getMySummary);

module.exports = router;
