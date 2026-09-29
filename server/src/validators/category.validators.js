const { isNonEmptyString, isValidObjectId } = require('../utils/validate');

function validateCreateCategory(body) {
  const errors = [];
  const { name, department, description, defaultHandler } = body;

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Category name is required' });
  }

  if (!isNonEmptyString(department)) {
    errors.push({ field: 'department', message: 'Department is required' });
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  if (
    defaultHandler !== undefined &&
    defaultHandler !== null &&
    defaultHandler !== '' &&
    !isValidObjectId(defaultHandler)
  ) {
    errors.push({ field: 'defaultHandler', message: 'Default handler must be a valid ID' });
  }

  return errors;
}

function validateUpdateCategory(body) {
  const errors = [];
  const { name, department, description, defaultHandler, isActive } = body;

  if (name !== undefined && !isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Category name cannot be empty' });
  }

  if (department !== undefined && !isNonEmptyString(department)) {
    errors.push({ field: 'department', message: 'Department cannot be empty' });
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  if (
    defaultHandler !== undefined &&
    defaultHandler !== null &&
    defaultHandler !== '' &&
    !isValidObjectId(defaultHandler)
  ) {
    errors.push({ field: 'defaultHandler', message: 'Default handler must be a valid ID' });
  }

  return errors;
}

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
};
