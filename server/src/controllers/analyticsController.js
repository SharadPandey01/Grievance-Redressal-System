const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/summary
 * Admin only. Global aggregated metrics.
 */
const getSummary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSummary();
  return sendSuccess(res, data);
});

/**
 * GET /api/analytics/my-summary
 * Any authenticated user. Role-aware personal metrics.
 */
const getMySummary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getMySummary(req.user);
  return sendSuccess(res, data);
});

module.exports = { getSummary, getMySummary };
