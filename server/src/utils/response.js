function sendSuccess(res, data, statusCode = 200, meta = null) {
  const body = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

function sendError(res, statusCode, message, errors = []) {
  const body = { success: false, message };
  if (errors.length > 0) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
