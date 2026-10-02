import { forwardRef } from 'react';
import { classNames } from '../../lib/classNames';

export const Textarea = forwardRef(function Textarea(
  {
    error = false,
    rows = 4,
    className = '',
    disabled = false,
    id,
    ...props
  },
  ref
) {
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      disabled={disabled}
      className={classNames(
        'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900',
        'placeholder:text-slate-400 transition-colors resize-y',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        error
          ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100',
        disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : '',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
