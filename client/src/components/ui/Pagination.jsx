import { ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames } from '../../lib/classNames';

export function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  limit = 10,
  className = '',
}) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = totalItems ? Math.min((page - 1) * limit + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(page * limit, totalItems) : 0;

  // Build page numbers list with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={classNames(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3',
        className
      )}
    >
      {/* Information text */}
      {totalItems !== undefined && (
        <div className="text-xs sm:text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{startItem}</span> to{' '}
          <span className="font-medium text-slate-900">{endItem}</span> of{' '}
          <span className="font-medium text-slate-900">{totalItems}</span> results
        </div>
      )}

      {/* Pagination Controls */}
      <nav
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
        aria-label="Pagination"
      >
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          className={classNames(
            'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors',
            'hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
            page <= 1 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex h-8 w-8 items-center justify-center text-xs text-slate-400 select-none"
              >
                ...
              </span>
            );
          }

          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange?.(p)}
              className={classNames(
                'inline-flex h-8 min-w-[2rem] px-2 items-center justify-center rounded-md text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          className={classNames(
            'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors',
            'hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
            page >= totalPages ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

export default Pagination;
