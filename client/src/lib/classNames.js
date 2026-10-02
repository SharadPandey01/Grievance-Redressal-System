/**
 * Utility to conditionally join class names into a single string.
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default classNames;
