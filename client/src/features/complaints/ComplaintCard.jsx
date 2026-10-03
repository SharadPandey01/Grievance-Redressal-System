import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, Building, User } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { classNames } from '../../lib/classNames';

export function ComplaintCard({
  complaint,
  showAssignee = false,
  showFiler = false,
  className = '',
}) {
  if (!complaint) return null;

  const categoryName = complaint.category?.name || complaint.category || 'General';
  const departmentName = complaint.category?.department;
  const isResolved = complaint.status === 'Resolved';
  const isOverdue = !!complaint.isOverdue;

  return (
    <Link
      to={`/complaints/${complaint._id}`}
      className={classNames(
        'group block rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200',
        'hover:border-indigo-300 hover:shadow-md hover:bg-slate-50/40',
        isResolved ? 'border-l-4 border-l-emerald-500' : isOverdue ? 'border-l-4 border-l-rose-500' : '',
        className
      )}
    >
      {/* Top row: Code + Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 transition-colors">
            {complaint.code || 'GRV-XXXX'}
          </span>
          {isResolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200 animate-pulse">
              <CheckCircle2 className="h-3 w-3" />
              Action needed
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={complaint.priority} size="sm" />
          <StatusBadge status={complaint.status} size="sm" />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
        {complaint.title}
      </h4>

      {/* Category & Department */}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded">
          {categoryName}
        </span>
        {departmentName && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Building className="h-3 w-3 text-slate-400" />
            {departmentName}
          </span>
        )}
      </div>

      {/* Additional Filer/Assignee details if requested */}
      {(showFiler || showAssignee) && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          {showFiler && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" />
              <span>
                {complaint.isAnonymous
                  ? 'Anonymous'
                  : complaint.filedBy?.name || complaint.filedByLabel || 'Complainant'}
              </span>
            </div>
          )}
          {showAssignee && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Assigned:</span>
              <span className="font-medium text-slate-700">
                {complaint.assignedTo?.name || 'Unassigned'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom row: Created & Due info */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Filed {formatDate(complaint.createdAt)}
        </span>

        <div className="flex items-center gap-2">
          {isOverdue ? (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <AlertTriangle className="h-3 w-3 text-rose-600" />
              Overdue
            </span>
          ) : complaint.dueAt && !['Resolved', 'Closed'].includes(complaint.status) ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3 text-slate-400" />
              Due {formatDate(complaint.dueAt)}
            </span>
          ) : null}
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

export default ComplaintCard;
