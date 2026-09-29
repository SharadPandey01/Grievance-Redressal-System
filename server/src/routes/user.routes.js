const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../utils/validate');
const { ROLES } = require('../constants');
const {
  validateCreateUser,
  validateUpdateUser,
} = require('../validators/user.validators');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

// Specific routes first to prevent :id conflict
router.get(
  '/officers',
  authorize(ROLES.OFFICER, ROLES.ADMIN),
  userController.getOfficers
);

// Admin-only user management
router.get(
  '/',
  authorize(ROLES.ADMIN),
  userController.getUsers
);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validateBody(validateCreateUser),
  userController.createUser
);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validateBody(validateUpdateUser),
  userController.updateUser
);

module.exports = router;
