import { forwardRef } from 'react';
import { classNames } from '../../lib/classNames';

export const Input = forwardRef(function Input(
  {
    type = 'text',
    error = false,
    icon: Icon,
    className = '',
    disabled = false,
    id,
    ...props
  },
  ref
) {
  return (
    <div className="relative w-full">
      {Icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        disabled={disabled}
        className={classNames(
          'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900',
          'placeholder:text-slate-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          Icon ? 'pl-9' : '',
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100',
          disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : '',
          className
        )}
        {...props}
      />
    </div>
  );
});

export default Input;
