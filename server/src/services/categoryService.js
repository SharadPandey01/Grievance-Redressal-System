const Category = require('../models/Category');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { isValidObjectId } = require('../utils/validate');
const { ROLES } = require('../constants');

/**
 * Fetch categories sorted by name.
 * Active-only for regular users; admins can pass all=true to see inactive.
 */
async function getCategories({ user, all }) {
  const filter = {};
  if (!(user && user.role === ROLES.ADMIN && all === 'true')) {
    filter.isActive = true;
  }

  return Category.find(filter)
    .sort({ name: 1 })
    .populate('defaultHandler', '_id name');
}

/**
 * Create a new category with unique name and optional active officer handler.
 */
async function createCategory(data) {
  const { name, description, department, defaultHandler } = data;

  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
  });
  if (existing) {
    throw new ApiError(409, 'Category with this name already exists');
  }

  let handlerId = null;
  if (defaultHandler) {
    if (!isValidObjectId(defaultHandler)) {
      throw new ApiError(400, 'Invalid default handler ID');
    }
    const officer = await User.findById(defaultHandler);
    if (!officer || !officer.isActive || officer.role !== ROLES.OFFICER) {
      throw new ApiError(400, 'Default handler must be an active officer');
    }
    handlerId = officer._id;
  }

  const category = await Category.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    department: department.trim(),
    defaultHandler: handlerId,
    isActive: true,
  });

  await category.populate('defaultHandler', '_id name');
  return category;
}

/**
 * Update an existing category by ID.
 */
async function updateCategory(id, data) {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid category ID format');
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const { name, description, department, defaultHandler, isActive } = data;

  if (name !== undefined) {
    const existing = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') },
    });
    if (existing) {
      throw new ApiError(409, 'Category with this name already exists');
    }
    category.name = name.trim();
  }

  if (description !== undefined) {
    category.description = description.trim();
  }

  if (department !== undefined) {
    category.department = department.trim();
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  if (defaultHandler !== undefined) {
    if (defaultHandler) {
      if (!isValidObjectId(defaultHandler)) {
        throw new ApiError(400, 'Invalid default handler ID');
      }
      const officer = await User.findById(defaultHandler);
      if (!officer || !officer.isActive || officer.role !== ROLES.OFFICER) {
        throw new ApiError(400, 'Default handler must be an active officer');
      }
      category.defaultHandler = officer._id;
    } else {
      category.defaultHandler = null;
    }
  }

  await category.save();
  await category.populate('defaultHandler', '_id name');
  return category;
}

/**
 * Soft delete category by setting isActive to false.
 */
async function deleteCategory(id) {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid category ID format');
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  category.isActive = false;
  await category.save();
  await category.populate('defaultHandler', '_id name');
  return category;
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
