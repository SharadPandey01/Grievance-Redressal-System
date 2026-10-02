import { classNames } from '../../lib/classNames';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm border border-transparent focus-visible:ring-indigo-500',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 focus-visible:ring-slate-400',
  outline:
    'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-xs focus-visible:ring-indigo-500',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm border border-transparent focus-visible:ring-rose-500',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-3.5 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-medium rounded-lg gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={classNames(
        'inline-flex items-center justify-center transition-colors select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variantClass,
        sizeClass,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-55 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className
      )}
      {...props}
    >
      {loading ? (
        <Spinner
          size={size === 'lg' ? 'md' : 'sm'}
          className={
            variant === 'primary' || variant === 'danger'
              ? 'text-white'
              : 'text-slate-600'
          }
        />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

export default Button;
