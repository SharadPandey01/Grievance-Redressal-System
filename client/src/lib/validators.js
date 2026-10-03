/**
 * Client-side validation helpers matching server validation rules.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  // Min 8 characters, at least 1 letter and 1 number (matches server isValidPassword)
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Validate login form input
 */
export function validateLogin({ email, password }) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate registration form input
 */
export function validateRegister({
  name,
  email,
  password,
  confirmPassword,
  role,
  department,
}) {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Full name is required';
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (name.trim().length > 100) {
    errors.name = 'Name cannot exceed 100 characters';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (!isValidPassword(password)) {
    errors.password = 'Password must be at least 8 characters and contain at least 1 letter and 1 number';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!role) {
    errors.role = 'Role selection is required';
  } else if (!['student', 'staff'].includes(role)) {
    errors.role = 'Public registration is only allowed for Student or Staff';
  }

  if (department && department.trim().length > 100) {
    errors.department = 'Department cannot exceed 100 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate profile update
 */
export function validateUpdateProfile({ name, department }) {
  const errors = {};

  if (name !== undefined) {
    if (!name || !name.trim()) {
      errors.name = 'Name cannot be empty';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }
  }

  if (department !== undefined && department.trim().length > 100) {
    errors.department = 'Department cannot exceed 100 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate change password
 */
export function validateChangePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required';
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required';
  } else if (!isValidPassword(newPassword)) {
    errors.newPassword = 'New password must be at least 8 characters with at least 1 letter and 1 number';
  } else if (currentPassword && currentPassword === newPassword) {
    errors.newPassword = 'New password must be different from current password';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm new password is required';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
