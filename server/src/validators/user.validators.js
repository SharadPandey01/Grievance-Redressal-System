const { isEmail, isNonEmptyString, isOneOf } = require('../utils/validate');
const { isValidPassword } = require('./auth.validators');
const { ROLES } = require('../constants');

const ALLOWED_ROLES = Object.values(ROLES);

function validateCreateUser(body) {
  const errors = [];
  const { name, email, password, role, department } = body;

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!isNonEmptyString(email)) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isEmail(email)) {
    errors.push({ field: 'email', message: 'Must be a valid email address' });
  }

  if (!isNonEmptyString(password)) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (!isValidPassword(password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters and contain at least one letter and one number',
    });
  }

  if (!isNonEmptyString(role)) {
    errors.push({ field: 'role', message: 'Role is required' });
  } else if (!isOneOf(role, ALLOWED_ROLES)) {
    errors.push({ field: 'role', message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
  } else if (role === ROLES.OFFICER && !isNonEmptyString(department)) {
    errors.push({ field: 'department', message: 'Department is required for officers' });
  }

  if (department !== undefined && department !== null && typeof department !== 'string') {
    errors.push({ field: 'department', message: 'Department must be a string' });
  }

  return errors;
}

function validateUpdateUser(body) {
  const errors = [];
  const { name, role, department, isActive } = body;

  if (name !== undefined && !isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  }

  if (role !== undefined) {
    if (!isNonEmptyString(role) || !isOneOf(role, ALLOWED_ROLES)) {
      errors.push({ field: 'role', message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }
  }

  if (department !== undefined && department !== null && typeof department !== 'string') {
    errors.push({ field: 'department', message: 'Department must be a string' });
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  return errors;
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
};
