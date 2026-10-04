import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Clock,
  Star,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  Button,
  Card,
  PageHeader,
  PriorityBadge,
  Skeleton,
} from '../components/ui';
import { getSummary } from '../api/analytics';
import { getComplaints } from '../api/complaints';
import { useFetch } from '../hooks/useFetch';
import { formatDate, getDaysOverdue } from '../lib/format';

const STATUS_CHART_COLORS = {
  Submitted: '#3b82f6',
  Acknowledged: '#6366f1',
  'In Progress': '#f59e0b',
  Resolved: '#10b981',
  Closed: '#64748b',
};

const PRIORITY_CHART_COLORS = {
  High: '#f43f5e',
  Medium: '#f59e0b',
  Low: '#94a3b8',
};

export function AdminDashboardPage() {
  const fetchSummaryData = useCallback(() => getSummary(), []);
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useFetch(fetchSummaryData, [], { pollMs: 30000 });

  const fetchOverdue = useCallback(() => {
    return getComplaints({ overdue: 'true', sort: 'dueAt', limit: 5 });
  }, []);
  const {
    data: overdueComplaints,
    loading: overdueLoading,
    refetch: refetchOverdue,
  } = useFetch(fetchOverdue, [], { pollMs: 30000 });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchOverdue();
  };

  const totals = summary?.totals || { all: 0, open: 0, resolved: 0, closed: 0, overdue: 0 };
  const byStatusData = (summary?.byStatus || []).filter((item) => item.count > 0);
  const byCategoryData = (summary?.byCategory || []).slice(0, 8);
  const byDepartmentData = (summary?.byDepartment || []).slice(0, 8);
  const byPriorityData = summary?.byPriority || [];
  const trendData = summary?.monthlyTrend || [];

  const formatResolutionHours = (hrs) => {
    if (!hrs || hrs === 0) return '—';
    if (hrs >= 24) {
      const days = (hrs / 24).toFixed(1);
      return `${days} ${days === '1.0' ? 'day' : 'days'}`;
    }
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Campus Grievance Analytics"
        subtitle="Global monitoring, SLA compliance metrics, resolution trends, and operational insights."
        breadcrumbs={[{ label: 'Home', href: '/admin' }, { label: 'Analytics' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCw}
              onClick={handleRefreshAll}
              title="Refresh all metrics"
            >
              Refresh
            </Button>
            <Link to="/admin/complaints">
              <Button variant="primary" size="sm" icon={ExternalLink}>
                Manage Complaints
              </Button>
            </Link>
          </div>
        }
      />

      {summaryError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">
              {summaryError?.message || 'Failed to load analytics dashboard data.'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Grievances
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="48px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {totals.all}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">All registered complaints</p>
        </Card>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Active / Open
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="48px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
              {totals.open}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Under investigation</p>
        </Card>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Overdue SLA
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="48px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
              {totals.overdue}
            </p>
          )}
          <p className="mt-1 text-[11px] text-rose-600 font-medium">
            {totals.overdue > 0 ? 'Requires escalation' : '100% SLA compliant'}
          </p>
        </Card>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Avg Resolution
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="64px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
              {formatResolutionHours(summary?.avgResolutionHours)}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Creation to resolution</p>
        </Card>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Average Rating
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <Star className="h-4 w-4 fill-amber-400" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="56px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              {summary?.avgRating && summary.avgRating > 0 ? (
                <>
                  <span>{summary.avgRating.toFixed(1)}</span>
                  <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400">No ratings</span>
              )}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Complainant satisfaction</p>
        </Card>

        <Card className="border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              Reopen Rate
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton width="48px" height="32px" className="mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold tracking-tight text-purple-700">
              {summary?.reopenRate !== undefined ? `${summary.reopenRate}%` : '0%'}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Reopened grievances</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Status Distribution</h3>
            <p className="text-xs text-slate-500">Active and resolved grievance proportion</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {summaryLoading ? (
              <Skeleton width="180px" height="180px" className="rounded-full" />
            ) : byStatusData.length === 0 ? (
              <div className="text-center text-xs text-slate-400">
                <Inbox className="h-8 w-8 mx-auto mb-1 text-slate-300" />
                No complaints registered
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {byStatusData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_CHART_COLORS[entry.status] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} complaints`, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs lg:col-span-2 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">6-Month Resolution Trend</h3>
            <p className="text-xs text-slate-500">Inflow vs. outflow of complaints over the last 6 months</p>
          </div>
          <div className="h-64 w-full">
            {summaryLoading ? (
              <Skeleton width="100%" height="100%" />
            ) : trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend history recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Complaints by Category</h3>
            <p className="text-xs text-slate-500">Distribution across grievance categories</p>
          </div>
          <div className="h-64 w-full">
            {summaryLoading ? (
              <Skeleton width="100%" height="100%" />
            ) : byCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categorical data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byCategoryData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} complaints`, 'Total']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Complaints by Department</h3>
            <p className="text-xs text-slate-500">Department administrative volume</p>
          </div>
          <div className="h-64 w-full">
            {summaryLoading ? (
              <Skeleton width="100%" height="100%" />
            ) : byDepartmentData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byDepartmentData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [`${val} complaints`, 'Total']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Complaints by Priority</h3>
            <p className="text-xs text-slate-500">Severity distribution</p>
          </div>
          <div className="h-64 w-full">
            {summaryLoading ? (
              <Skeleton width="100%" height="100%" />
            ) : byPriorityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No priority data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPriorityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [`${val} complaints`, 'Total']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {byPriorityData.map((entry) => (
                      <Cell
                        key={entry.priority}
                        fill={PRIORITY_CHART_COLORS[entry.priority] || '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Grievances Needing Attention (Overdue SLA)
            </h3>
            <p className="text-xs text-slate-500">Top overdue complaints requiring administrative oversight</p>
          </div>
          <Link
            to="/admin/complaints?overdue=true"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View all overdue ({totals.overdue})
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {overdueLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                <Skeleton width="30%" height="20px" className="mb-2" />
                <Skeleton width="80%" height="16px" className="mb-2" />
                <Skeleton width="50%" height="14px" />
              </div>
            ))}
          </div>
        )}

        {!overdueLoading && overdueComplaints && overdueComplaints.length === 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-emerald-900">All Grievances on Schedule</h4>
            <p className="text-xs text-emerald-700 mt-1">
              There are currently no overdue complaints. All department officers are operating within SLA commitments.
            </p>
          </div>
        )}

        {!overdueLoading && overdueComplaints && overdueComplaints.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-rose-50/60 text-xs font-semibold uppercase tracking-wider text-rose-800">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Code</th>
                    <th scope="col" className="px-5 py-3.5">Title & Category</th>
                    <th scope="col" className="px-5 py-3.5">Priority</th>
                    <th scope="col" className="px-5 py-3.5">Assigned Officer</th>
                    <th scope="col" className="px-5 py-3.5">SLA Target</th>
                    <th scope="col" className="px-5 py-3.5">Days Overdue</th>
                    <th scope="col" className="px-4 py-3.5 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueComplaints.map((c) => {
                    const daysOverdue = getDaysOverdue(c.dueAt);
                    return (
                      <tr
                        key={c._id}
                        className="hover:bg-rose-50/30 transition-colors"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {c.code}
                          </span>
                        </td>
                        <td className="px-5 py-4 max-w-sm">
                          <div className="font-medium text-slate-900 line-clamp-1">
                            {c.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.category?.name || 'General'} • {c.category?.department}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <PriorityBadge priority={c.priority} size="sm" />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                          {c.assignedTo?.name ? (
                            <span className="font-medium">{c.assignedTo.name}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(c.dueAt)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                          <Link
                            to={`/complaints/${c._id}`}
                            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Open
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
