import { classNames } from '../../lib/classNames';

export function FormField({
  label,
  error,
  required = false,
  hint,
  id,
  children,
  className = '',
}) {
  const errorMessage =
    typeof error === 'string'
      ? error
      : Array.isArray(error) && error.length > 0
      ? error[0].message || error[0]
      : null;

  return (
    <div className={classNames('w-full space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
          {hint && !errorMessage && (
            <span className="text-xs text-slate-500">{hint}</span>
          )}
        </div>
      )}
      <div>{children}</div>
      {errorMessage && (
        <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default FormField;
