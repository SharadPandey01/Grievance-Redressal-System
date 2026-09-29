const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.getUsers({ query: req.query });
  sendSuccess(res, users, 200, meta);
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  sendSuccess(res, user, 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser({
    id: req.params.id,
    data: req.body,
    currentUser: req.user,
  });
  sendSuccess(res, user);
});

const getOfficers = asyncHandler(async (req, res) => {
  const officers = await userService.getOfficers({
    currentUser: req.user,
    departmentFilter: req.query.department,
  });
  sendSuccess(res, officers);
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  getOfficers,
};
