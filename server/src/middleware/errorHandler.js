const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err instanceof ApiError) {
    return sendError(res, statusCode, message, errors);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, statusCode, message, errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
    return sendError(res, statusCode, message);
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
    return sendError(res, statusCode, message);
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.message || 'File upload error';
    return sendError(res, statusCode, message);
  }

  logger.error(`Unhandled error: ${err.stack}`);

  const responseMessage = config.nodeEnv === 'production' ? 'Internal server error' : err.message;
  return sendError(res, 500, responseMessage);
}

module.exports = errorHandler;
