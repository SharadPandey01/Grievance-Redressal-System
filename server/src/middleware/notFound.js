const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
