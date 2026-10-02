import { classNames } from '../../lib/classNames';

const BADGE_VARIANTS = {
  default: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  sky: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
};

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const styles = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        styles.badge,
        sizeClass,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={classNames('h-1.5 w-1.5 rounded-full shrink-0', styles.dot)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
