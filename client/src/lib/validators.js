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

/**
 * Attachment constraints
 */
export const ATTACHMENT_RULES = {
  MAX_FILES: 3,
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
};

/**
 * Validate attachment files on client
 */
export function validateAttachments(files, existingCount = 0) {
  const errors = [];
  const validFiles = [];

  if (files.length + existingCount > ATTACHMENT_RULES.MAX_FILES) {
    errors.push(`Maximum ${ATTACHMENT_RULES.MAX_FILES} attachments allowed.`);
    return { validFiles: [], errors };
  }

  for (const file of files) {
    const isAllowedType =
      ATTACHMENT_RULES.ALLOWED_TYPES.includes(file.type) ||
      ATTACHMENT_RULES.ALLOWED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

    if (!isAllowedType) {
      errors.push(`"${file.name}": Only JPG, PNG, and PDF files are allowed.`);
      continue;
    }

    if (file.size > ATTACHMENT_RULES.MAX_FILE_SIZE_BYTES) {
      errors.push(`"${file.name}": File size exceeds 5 MB limit.`);
      continue;
    }

    validFiles.push(file);
  }

  return {
    validFiles,
    errors,
  };
}

/**
 * Validate complaint creation
 */
export function validateCreateComplaint({ title, description, category, priority }) {
  const errors = {};

  if (!title || !title.trim()) {
    errors.title = 'Title is required';
  } else if (title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  } else if (title.trim().length > 120) {
    errors.title = 'Title cannot exceed 120 characters';
  }

  if (!description || !description.trim()) {
    errors.description = 'Description is required';
  } else if (description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters';
  } else if (description.trim().length > 2000) {
    errors.description = 'Description cannot exceed 2000 characters';
  }

  if (!category || !category.trim()) {
    errors.category = 'Please select a category';
  }

  if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
    errors.priority = 'Priority must be Low, Medium, or High';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

