const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const complaintService = require('../services/complaintService');

/**
 * POST /api/complaints
 * Creates a new complaint. Files already validated by multer middleware.
 */
const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.createComplaint(req.user, req.body, req.files);
  return sendSuccess(res, complaint, 201);
});

/**
 * GET /api/complaints
 * Returns a paginated, role-scoped list of complaints.
 */
const listComplaints = asyncHandler(async (req, res) => {
  const { complaints, meta } = await complaintService.listComplaints(req.user, req.query);
  return sendSuccess(res, complaints, 200, meta);
});

/**
 * GET /api/complaints/:id
 * Returns full detail for a single complaint.
 */
const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintById(req.user, req.params.id);
  return sendSuccess(res, complaint);
});

/**
 * GET /api/complaints/:id/attachments/:filename
 * Streams an attachment file after verifying the user has access to the complaint.
 */
const downloadAttachment = asyncHandler(async (req, res) => {
  const { filePath, mimetype, originalName } = await complaintService.resolveAttachment(
    req.user,
    req.params.id,
    req.params.filename
  );

  // Set content-type and a friendly download filename for the browser
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);

  // filePath is absolute (path.resolve in the service) — no root option needed
  res.sendFile(filePath);
});

module.exports = {
  createComplaint,
  listComplaints,
  getComplaintById,
  downloadAttachment,
};
