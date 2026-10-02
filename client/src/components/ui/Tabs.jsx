import { classNames } from '../../lib/classNames';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) {
  if (variant === 'pills') {
    return (
      <div
        className={classNames(
          'inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-slate-600',
          className
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={classNames(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={classNames(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: underline variant
  return (
    <div className={classNames('border-b border-slate-200', className)}>
      <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange?.(tab.id)}
              className={classNames(
                'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                isActive
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              {Icon && (
                <Icon
                  className={classNames(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  )}
                  aria-hidden="true"
                />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={classNames(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Tabs;
