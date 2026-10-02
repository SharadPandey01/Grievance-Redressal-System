import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNames } from '../../lib/classNames';

export const Select = forwardRef(function Select(
  {
    options = [],
    placeholder,
    error = false,
    className = '',
    disabled = false,
    children,
    id,
    ...props
  },
  ref
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        id={id}
        disabled={disabled}
        className={classNames(
          'block w-full appearance-none rounded-lg border bg-white px-3.5 py-2 pr-10 text-sm text-slate-900',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100',
          disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : '',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children
          ? children
          : options.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              const isOptDisabled = typeof opt === 'object' && opt.disabled;
              return (
                <option key={val} value={val} disabled={isOptDisabled}>
                  {lbl}
                </option>
              );
            })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </div>
    </div>
  );
});

export default Select;
