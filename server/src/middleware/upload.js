const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const { ATTACHMENT_MAX_COUNT, ATTACHMENT_MAX_SIZE_BYTES, ATTACHMENT_ALLOWED_TYPES } = require('../constants');

// Resolve once at module load — multer destination must be absolute
const UPLOAD_ABS = path.resolve(config.uploadDir);

// Store files on disk with a random filename to avoid collisions.
// The original filename is preserved separately in the complaint's attachments array.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_ABS);
  },
  filename: function (req, file, cb) {
    // 16 random bytes as hex + original extension = unique filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, randomName + ext);
  },
});

// Reject files that are not jpg, png, or pdf before they hit the disk
function fileFilter(req, file, cb) {
  if (ATTACHMENT_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // We reject with a plain Error so errorHandler sends a clear 400
    const err = new Error(`File type not allowed. Accepted: jpg, png, pdf`);
    err.status = 400;
    cb(err, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ATTACHMENT_MAX_SIZE_BYTES, // 5 MB per file
    files: ATTACHMENT_MAX_COUNT,         // max 3 files per request
  },
});

module.exports = upload;
