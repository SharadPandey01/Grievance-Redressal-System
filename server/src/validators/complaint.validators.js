const { hasLength, isValidObjectId, isOneOf } = require('../utils/validate');
const { PRIORITIES } = require('../constants');

/**
 * Validate the body fields for creating a complaint.
 * Note: multipart requests parse body fields as strings, so we coerce booleans.
 * File validation is handled by multer before this runs.
 */
function validateCreateComplaint(body) {
  const errors = [];

  if (!hasLength(body.title, 5, 120)) {
    errors.push({ field: 'title', message: 'Title must be between 5 and 120 characters' });
  }

  if (!hasLength(body.description, 20, 2000)) {
    errors.push({ field: 'description', message: 'Description must be between 20 and 2000 characters' });
  }

  if (!body.category || !isValidObjectId(body.category)) {
    errors.push({ field: 'category', message: 'A valid category ID is required' });
  }

  // Priority is optional (defaults to Medium), but if provided it must be valid
  if (body.priority && !isOneOf(body.priority, Object.values(PRIORITIES))) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${Object.values(PRIORITIES).join(', ')}` });
  }

  return errors;
}

module.exports = { validateCreateComplaint };
