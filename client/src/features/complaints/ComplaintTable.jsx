import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, User, Building } from 'lucide-react';
import { StatusBadge, PriorityBadge, Skeleton } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { classNames } from '../../lib/classNames';

export function ComplaintTable({
  complaints = [],
  loading = false,
  showAssignee = false,
  showFiler = false,
  className = '',
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={classNames('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs', className)}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3.5">Code</th>
                <th scope="col" className="px-5 py-3.5">Title & Category</th>
                <th scope="col" className="px-5 py-3.5">Priority</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                {showFiler && <th scope="col" className="px-5 py-3.5">Filed By</th>}
                {showAssignee && <th scope="col" className="px-5 py-3.5">Assigned To</th>}
                <th scope="col" className="px-5 py-3.5">Submitted</th>
                <th scope="col" className="px-5 py-3.5">SLA Target</th>
                <th scope="col" className="px-4 py-3.5 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><Skeleton width="90px" height="20px" /></td>
                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      <Skeleton width="70%" height="16px" />
                      <Skeleton width="40%" height="12px" />
                    </div>
                  </td>
                  <td className="px-5 py-4"><Skeleton width="70px" height="22px" /></td>
                  <td className="px-5 py-4"><Skeleton width="85px" height="22px" /></td>
                  {showFiler && <td className="px-5 py-4"><Skeleton width="90px" height="16px" /></td>}
                  {showAssignee && <td className="px-5 py-4"><Skeleton width="90px" height="16px" /></td>}
                  <td className="px-5 py-4"><Skeleton width="80px" height="14px" /></td>
                  <td className="px-5 py-4"><Skeleton width="90px" height="14px" /></td>
                  <td className="px-4 py-4 text-right"><Skeleton width="24px" height="24px" className="ml-auto rounded-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-5 py-3.5">Code</th>
              <th scope="col" className="px-5 py-3.5">Title & Category</th>
              <th scope="col" className="px-5 py-3.5">Priority</th>
              <th scope="col" className="px-5 py-3.5">Status</th>
              {showFiler && <th scope="col" className="px-5 py-3.5">Filed By</th>}
              {showAssignee && <th scope="col" className="px-5 py-3.5">Assigned To</th>}
              <th scope="col" className="px-5 py-3.5">Submitted</th>
              <th scope="col" className="px-5 py-3.5">SLA Target</th>
              <th scope="col" className="px-4 py-3.5 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((c) => {
              const categoryName = c.category?.name || c.category || 'General';
              const departmentName = c.category?.department;
              const isResolved = c.status === 'Resolved';
              const isOverdue = !!c.isOverdue;

              return (
                <tr
                  key={c._id}
                  onClick={() => navigate(`/complaints/${c._id}`)}
                  className={classNames(
                    'group cursor-pointer transition-colors duration-150',
                    'hover:bg-slate-50/80',
                    isResolved ? 'bg-emerald-50/20' : ''
                  )}
                >
                  {/* Code */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 transition-colors">
                      {c.code || 'GRV-XXXX'}
                    </span>
                  </td>

                  {/* Title & Category */}
                  <td className="px-5 py-4 max-w-xs md:max-w-md">
                    <div className="font-medium text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {c.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {categoryName}
                      </span>
                      {departmentName && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Building className="h-3 w-3" />
                          {departmentName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <PriorityBadge priority={c.priority} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} size="sm" />
                      {isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Action needed
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Filed By */}
                  {showFiler && (
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {c.isAnonymous
                            ? 'Anonymous'
                            : c.filedBy?.name || c.filedByLabel || 'Complainant'}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Assigned To */}
                  {showAssignee && (
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                      {c.assignedTo?.name ? (
                        <span className="font-medium text-slate-800">{c.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                  )}

                  {/* Submitted Date */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                    {formatDate(c.createdAt)}
                  </td>

                  {/* SLA Target / Overdue */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                        Overdue
                      </span>
                    ) : c.dueAt && !['Resolved', 'Closed'].includes(c.status) ? (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Due {formatDate(c.dueAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Action Link Arrow */}
                  <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComplaintTable;
