const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const registerHandler = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendSuccess(res, user, 201);
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendSuccess(res, result);
});

const getMeHandler = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user);
});

const updateMeHandler = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user._id, req.body);
  sendSuccess(res, user);
});

const changePasswordHandler = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  sendSuccess(res, { message: 'Password changed successfully' });
});

module.exports = {
  registerHandler,
  loginHandler,
  getMeHandler,
  updateMeHandler,
  changePasswordHandler,
};
