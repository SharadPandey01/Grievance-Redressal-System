const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { isValidObjectId } = require('../utils/validate');
const { ROLES } = require('../constants');

const BCRYPT_COST = 10;

/**
 * Fetch paginated users with filtering on role, department, isActive, and search.
 */
async function getUsers({ query }) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.role && Object.values(ROLES).includes(query.role)) {
    filter.role = query.role;
  }

  if (query.department && query.department.trim()) {
    filter.department = query.department.trim();
  }

  if (query.isActive !== undefined) {
    if (query.isActive === 'true') {
      filter.isActive = true;
    } else if (query.isActive === 'false') {
      filter.isActive = false;
    }
  }

  if (query.search && query.search.trim()) {
    const escaped = escapeRegex(query.search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const meta = buildMeta(page, limit, total);
  return { users, meta };
}

/**
 * Admin creates a user of any role with a temporary password.
 */
async function createUser(data) {
  const { name, email, password, role, department } = data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'User with this email already exists');
  }

  if (role === ROLES.OFFICER && (!department || !department.trim())) {
    throw new ApiError(400, 'Department is required for officers');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    department: department ? department.trim() : undefined,
    isActive: true,
  });

  return user;
}

/**
 * Admin updates a user.
 * Guards against self-deactivation, self-demotion, and deactivating/demoting the last active admin.
 */
async function updateUser({ id, data, currentUser }) {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  const { name, role, department, isActive } = data;
  const isSelf = currentUser._id.toString() === targetUser._id.toString();

  // Guard: admin cannot deactivate or demote themself
  if (isSelf) {
    if (isActive === false) {
      throw new ApiError(409, 'You cannot deactivate your own account');
    }
    if (role !== undefined && role !== ROLES.ADMIN) {
      throw new ApiError(409, 'You cannot demote yourself from admin');
    }
  }

  // Guard: the last remaining active admin can never be demoted or deactivated
  const isTargetActiveAdmin = targetUser.role === ROLES.ADMIN && targetUser.isActive;
  const willDeactivate = isActive === false;
  const willDemote = role !== undefined && role !== ROLES.ADMIN;

  if (isTargetActiveAdmin && (willDeactivate || willDemote)) {
    const activeAdminCount = await User.countDocuments({
      role: ROLES.ADMIN,
      isActive: true,
    });
    if (activeAdminCount <= 1) {
      throw new ApiError(409, 'Cannot demote or deactivate the last remaining active admin');
    }
  }

  const nextRole = role !== undefined ? role : targetUser.role;
  const nextDept = department !== undefined ? department : targetUser.department;
  if (nextRole === ROLES.OFFICER && (!nextDept || !nextDept.trim())) {
    throw new ApiError(400, 'Department is required for officers');
  }

  if (name !== undefined) targetUser.name = name.trim();
  if (role !== undefined) targetUser.role = role;
  if (department !== undefined) targetUser.department = department ? department.trim() : undefined;
  if (isActive !== undefined) targetUser.isActive = isActive;

  await targetUser.save();
  return targetUser;
}

/**
 * Fetch active officers for assignment dropdowns.
 * Officers see only their own department; admins see all (or filtered by ?department=).
 */
async function getOfficers({ currentUser, departmentFilter }) {
  const filter = {
    role: ROLES.OFFICER,
    isActive: true,
  };

  if (currentUser.role === ROLES.OFFICER) {
    filter.department = currentUser.department;
  } else if (currentUser.role === ROLES.ADMIN) {
    if (departmentFilter && departmentFilter.trim()) {
      filter.department = departmentFilter.trim();
    }
  }

  return User.find(filter)
    .select('_id name email department')
    .sort({ name: 1 });
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  getOfficers,
};
