const { isEmail, isNonEmptyString, hasLength, isOneOf } = require('../utils/validate');
const { COMPLAINANT_ROLES } = require('../constants');

function validateRegister(body) {
  const errors = [];
  const { name, email, password, role } = body;

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
  } else if (!isOneOf(role, COMPLAINANT_ROLES)) {
    errors.push({ field: 'role', message: `Role must be one of: ${COMPLAINANT_ROLES.join(', ')}` });
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body;

  if (!isNonEmptyString(email)) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isEmail(email)) {
    errors.push({ field: 'email', message: 'Must be a valid email address' });
  }

  if (!isNonEmptyString(password)) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

function validateUpdateMe(body) {
  const errors = [];
  const { name, department } = body;

  if (name !== undefined && !isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  }

  if (department !== undefined && department !== null && typeof department !== 'string') {
    errors.push({ field: 'department', message: 'Department must be a string' });
  }

  return errors;
}

function validateChangePassword(body) {
  const errors = [];
  const { currentPassword, newPassword } = body;

  if (!isNonEmptyString(currentPassword)) {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (!isNonEmptyString(newPassword)) {
    errors.push({ field: 'newPassword', message: 'New password is required' });
  } else if (!isValidPassword(newPassword)) {
    errors.push({
      field: 'newPassword',
      message: 'Password must be at least 8 characters and contain at least one letter and one number',
    });
  }

  return errors;
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateMe,
  validateChangePassword,
  isValidPassword,
};
