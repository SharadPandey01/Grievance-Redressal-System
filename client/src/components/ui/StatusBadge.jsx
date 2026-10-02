import { classNames } from '../../lib/classNames';
import { STATUS_COLORS } from '../../lib/constants';

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function StatusBadge({ status, size = 'md', className = '', ...props }) {
  const config = STATUS_COLORS[status] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.badge,
        sizeClass,
        className
      )}
      {...props}
    >
      <span
        className={classNames('h-1.5 w-1.5 rounded-full shrink-0', config.dot)}
        aria-hidden="true"
      />
      {status || 'Unknown'}
    </span>
  );
}

export default StatusBadge;
