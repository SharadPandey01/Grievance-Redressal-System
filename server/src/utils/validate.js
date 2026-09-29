const mongoose = require('mongoose');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasLength(value, min, max) {
  if (typeof value !== 'string') return false;
  const len = value.trim().length;
  return len >= min && len <= max;
}

function isEmail(value) {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function isOneOf(value, allowedValues) {
  return allowedValues.includes(value);
}

function validateBody(validateFn) {
  return function (req, res, next) {
    const errors = validateFn(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next();
  };
}

module.exports = {
  isNonEmptyString,
  hasLength,
  isEmail,
  isValidObjectId,
  isOneOf,
  validateBody,
};
