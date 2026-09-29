/**
 * Escapes special regex characters in a string to safely use in dynamic RegExp construction.
 * @param {string} string
 * @returns {string}
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
