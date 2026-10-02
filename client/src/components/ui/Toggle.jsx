import { classNames } from '../../lib/classNames';

export function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
}) {
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={classNames('flex items-start justify-between gap-3', className)}>
      {(label || description) && (
        <label htmlFor={toggleId} className="flex flex-col cursor-pointer select-none">
          {label && (
            <span className="text-sm font-medium text-slate-800">{label}</span>
          )}
          {description && (
            <span className="text-xs text-slate-500">{description}</span>
          )}
        </label>
      )}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={classNames(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
          checked ? 'bg-indigo-600' : 'bg-slate-200',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

export default Toggle;
