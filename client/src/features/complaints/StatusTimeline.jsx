import { Check, Clock, User, Shield } from 'lucide-react';
import { Card, StatusBadge } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { STATUSES } from '../../lib/constants';
import { classNames } from '../../lib/classNames';

export function StatusTimeline({ status = 'Submitted', statusLogs = [], className = '' }) {
  const currentStatusIndex = STATUSES.indexOf(status);

  // Sort logs in reverse chronological order (newest first) for clean audit viewing
  const sortedLogs = [...statusLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className={classNames('overflow-hidden', className)}>
      <Card.Header className="pb-4">
        <Card.Title className="text-base flex items-center justify-between">
          <span>Lifecycle Timeline</span>
          <StatusBadge status={status} size="sm" />
        </Card.Title>
        <Card.Description>
          Auditable record of state transitions and assignments.
        </Card.Description>
      </Card.Header>

      <Card.Content className="space-y-6 pt-2">
        {/* ── Compact 5-Stage Progress Bar ──────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Redressal Progress
          </p>

          <div className="relative">
            {/* Connecting Bar */}
            <div
              className="absolute left-3 top-3.5 -translate-y-1/2 h-0.5 bg-slate-200"
              style={{ width: 'calc(100% - 24px)' }}
              aria-hidden="true"
            >
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (currentStatusIndex / (STATUSES.length - 1)) * 100)
                  )}%`,
                }}
              />
            </div>

            {/* Stages */}
            <div className="relative flex justify-between">
              {STATUSES.map((st, idx) => {
                const isCompleted = idx < currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                return (
                  <div key={st} className="flex flex-col items-center text-center max-w-[54px]">
                    <div
                      className={classNames(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                        isCompleted
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-white text-indigo-600 ring-2 ring-indigo-600 shadow-md scale-110 font-extrabold'
                          : 'bg-slate-200 text-slate-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={classNames(
                        'mt-1.5 text-[10px] leading-tight font-medium',
                        isCurrent
                          ? 'text-indigo-700 font-bold'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      )}
                    >
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Vertical Audit Log List ───────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Activity History ({sortedLogs.length})
          </p>

          {sortedLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No activity recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {sortedLogs.map((log, idx) => {
                const isLatest = idx === 0;
                const actorName = log.changedBy?.name || (log.changedBy ? 'Staff' : 'System');
                const actorRole = log.changedBy?.role;
                const isSystem = !log.changedBy;

                return (
                  <div key={log._id || idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={classNames(
                        'absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white transition-all',
                        isLatest
                          ? 'border-indigo-600 ring-4 ring-indigo-100'
                          : 'border-slate-300'
                      )}
                    >
                      <div
                        className={classNames(
                          'h-2 w-2 rounded-full',
                          isLatest ? 'bg-indigo-600' : 'bg-slate-300'
                        )}
                      />
                    </div>

                    {/* Timeline Entry Card */}
                    <div
                      className={classNames(
                        'rounded-lg p-3 text-xs transition-colors border',
                        isLatest
                          ? 'border-indigo-100 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-100 bg-white hover:bg-slate-50/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {log.toStatus || 'Updated'}
                          </span>
                          {log.fromStatus && log.fromStatus !== log.toStatus && (
                            <span className="text-[10px] text-slate-400">
                              (from {log.fromStatus})
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>

                      {/* Actor Information */}
                      <div className="flex items-center gap-1.5 text-slate-600 mb-1.5">
                        {isSystem ? (
                          <Shield className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className="font-medium text-slate-700">{actorName}</span>
                        {actorRole && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 uppercase">
                            {actorRole}
                          </span>
                        )}
                      </div>

                      {/* Note / Remarks */}
                      {log.note && (
                        <p className="text-slate-600 text-xs bg-white/70 p-2 rounded border border-slate-100/80 leading-relaxed whitespace-pre-wrap">
                          {log.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

export default StatusTimeline;
