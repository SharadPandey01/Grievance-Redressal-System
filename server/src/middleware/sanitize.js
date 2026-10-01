/**
 * middleware/sanitize.js
 *
 * Strip MongoDB operator injection from request bodies and query strings.
 * Keys starting with '$' or containing '.' are deleted recursively.
 * This prevents a class of NoSQL injection attacks where a client sends
 * { "email": { "$gt": "" } } to bypass authentication.
 *
 * Applied globally in app.js before any routes.
 */

/**
 * Recursively remove any key that starts with '$' or contains '.'
 * from a plain object.  Arrays are walked item by item.
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeObject);
    return;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Express middleware: sanitize req.body and req.query in-place.
 */
function sanitize(req, _res, next) {
  if (req.body)  sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  next();
}

module.exports = sanitize;
