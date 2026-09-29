const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../utils/validate');
const { ROLES } = require('../constants');
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require('../validators/category.validators');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

router.use(authenticate);

router.get('/', categoryController.getCategories);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validateBody(validateCreateCategory),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validateBody(validateUpdateCategory),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  categoryController.deleteCategory
);

module.exports = router;
