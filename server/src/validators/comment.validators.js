const { hasLength } = require('../utils/validate');

/**
 * Validate POST /api/complaints/:id/comments body.
 */
function validateCreateComment(body) {
  const errors = [];

  if (!hasLength(body.text, 1, 1000)) {
    errors.push({ field: 'text', message: 'Comment text must be between 1 and 1000 characters' });
  }

  // isInternal is optional boolean; service enforces role guard
  if (body.isInternal !== undefined && typeof body.isInternal !== 'boolean') {
    errors.push({ field: 'isInternal', message: 'isInternal must be a boolean' });
  }

  return errors;
}

module.exports = { validateCreateComment };
