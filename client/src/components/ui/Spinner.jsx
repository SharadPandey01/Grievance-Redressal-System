import { classNames } from '../../lib/classNames';

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-10 w-10 border-4',
};

export function Spinner({ size = 'md', className = 'text-indigo-600', ...props }) {
  const sizeClasses = SIZES[size] || SIZES.md;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={classNames(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        sizeClasses,
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
