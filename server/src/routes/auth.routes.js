const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateBody } = require('../utils/validate');
const {
  validateRegister,
  validateLogin,
  validateUpdateMe,
  validateChangePassword,
} = require('../validators/auth.validators');
const { authenticate } = require('../middleware/auth');
const {
  registerHandler,
  loginHandler,
  getMeHandler,
  updateMeHandler,
  changePasswordHandler,
} = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

router.post('/register', authLimiter, validateBody(validateRegister), registerHandler);
router.post('/login', authLimiter, validateBody(validateLogin), loginHandler);
router.get('/me', authenticate, getMeHandler);
router.patch('/me', authenticate, validateBody(validateUpdateMe), updateMeHandler);
router.post('/change-password', authenticate, validateBody(validateChangePassword), changePasswordHandler);

module.exports = router;
