const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories({
    user: req.user,
    all: req.query.all,
  });
  sendSuccess(res, categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  sendSuccess(res, category, 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  sendSuccess(res, category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.deleteCategory(req.params.id);
  sendSuccess(res, category);
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
