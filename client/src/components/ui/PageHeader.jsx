import { ChevronRight } from 'lucide-react';
import { classNames } from '../../lib/classNames';

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
  badge,
  className = '',
}) {
  return (
    <div className={classNames('mb-8 pb-6 border-b border-slate-200/80', className)}>
      {/* Optional Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center space-x-1.5 text-xs text-slate-500">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center space-x-1.5">
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                {isLast || !crumb.href ? (
                  <span className="font-medium text-slate-800">{crumb.label}</span>
                ) : (
                  <a
                    href={crumb.href}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {crumb.label}
                  </a>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Title + Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
