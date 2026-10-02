import { AlertCircle, AlertTriangle, ArrowDown } from 'lucide-react';
import { classNames } from '../../lib/classNames';
import { PRIORITY_COLORS } from '../../lib/constants';

const ICONS = {
  High: AlertCircle,
  Medium: AlertTriangle,
  Low: ArrowDown,
};

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function PriorityBadge({ priority, size = 'md', showIcon = true, className = '', ...props }) {
  const config = PRIORITY_COLORS[priority] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'text-slate-500',
  };
  const sizeClass = SIZES[size] || SIZES.md;
  const Icon = ICONS[priority];

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
      {showIcon && Icon && (
        <Icon className={classNames('h-3.5 w-3.5 shrink-0', config.icon)} aria-hidden="true" />
      )}
      {priority || 'Medium'}
    </span>
  );
}

export default PriorityBadge;
