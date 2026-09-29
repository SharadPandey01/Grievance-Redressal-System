const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

const BCRYPT_COST = 10;

/** Register a new complainant (student or staff). */
async function register(data) {
  const { name, email, password, role, department } = data;

  const normalizedEmail = email.trim().toLowerCase();

  if (config.allowedEmailDomain) {
    const domain = normalizedEmail.split('@')[1];
    if (domain !== config.allowedEmailDomain) {
      throw new ApiError(400, `Email must belong to the domain: ${config.allowedEmailDomain}`);
    }
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    department: department ? department.trim() : undefined,
  });

  return user;
}

/** Verify credentials and return a signed JWT. */
async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  const GENERIC_MSG = 'Invalid credentials';

  if (!user) {
    throw new ApiError(401, GENERIC_MSG);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new ApiError(401, GENERIC_MSG);
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const userObj = user.toJSON();

  return { token, user: userObj };
}

/** Update name and/or department for the authenticated user. */
async function updateMe(userId, updates) {
  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name.trim();
  if (updates.department !== undefined) allowed.department = updates.department;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: allowed },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

/** Change the authenticated user's password. */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await user.save();
}

module.exports = { register, login, updateMe, changePassword };
