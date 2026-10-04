import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Inbox,
  Clock,
  AlertTriangle,
  RotateCw,
  Search,
  X,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  PageHeader,
  Select,
  Tabs,
  Pagination,
  EmptyState,
  ConfirmDialog,
  Toggle,
  Skeleton,
} from '../components/ui';
import { ComplaintTable, ComplaintCard } from '../features/complaints';
import { getComplaints, assignComplaint } from '../api/complaints';
import { getMySummary } from '../api/analytics';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { STATUSES, PRIORITIES } from '../lib/constants';
import { classNames } from '../lib/classNames';

export function OfficerQueuePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') || 'assigned';
  const statusParam = searchParams.get('status') || 'All';
  const priorityParam = searchParams.get('priority') || 'All';
  const overdueParam = searchParams.get('overdue') === 'true';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'dueAt';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limit = 10;

  const [searchInput, setSearchInput] = useState(searchParam);
  const [confirmAssignTarget, setConfirmAssignTarget] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const updateFilters = useCallback(
    (newParams) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(newParams).forEach(([key, value]) => {
            if (
              value === undefined ||
              value === null ||
              value === '' ||
              value === 'All' ||
              (key === 'page' && value === 1) ||
              (key === 'overdue' && !value) ||
              (key === 'tab' && value === 'assigned') ||
              (key === 'sort' && value === 'dueAt')
            ) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateFilters({ search: searchInput || null, page: 1 });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, searchParam, updateFilters]);

  const fetchSummary = useCallback(() => getMySummary(), []);
  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useFetch(fetchSummary, [], { pollMs: 30000 });

  const assignedCount = (summaryData?.byStatus || []).reduce((sum, item) => sum + item.count, 0);
  const inProgressCount =
    (summaryData?.byStatus || []).find((s) => s.status === 'In Progress')?.count || 0;
  const overdueCount = summaryData?.overdue ?? 0;
  const unassignedPoolCount = summaryData?.unassignedPool ?? 0;

  const fetchComplaints = useCallback(() => {
    const params = {
      page: pageParam,
      limit,
      scope: tabParam,
      sort: sortParam,
    };

    if (statusParam !== 'All') params.status = statusParam;
    if (priorityParam !== 'All') params.priority = priorityParam;
    if (overdueParam) params.overdue = 'true';
    if (searchParam.trim()) params.search = searchParam.trim();

    return getComplaints(params);
  }, [pageParam, limit, tabParam, sortParam, statusParam, priorityParam, overdueParam, searchParam]);

  const {
    data: complaints,
    meta,
    loading: complaintsLoading,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useFetch(
    fetchComplaints,
    [pageParam, tabParam, sortParam, statusParam, priorityParam, overdueParam, searchParam],
    { pollMs: 30000 }
  );

  const handleRefresh = () => {
    refetchSummary();
    refetchComplaints();
  };

  const handleTabChange = (newTab) => {
    updateFilters({ tab: newTab, page: 1 });
  };

  const handleAssignToMe = async () => {
    if (!confirmAssignTarget) return;
    setAssigning(true);
    try {
      await assignComplaint(confirmAssignTarget._id, { assigneeId: user._id });
      toast.success(`Complaint ${confirmAssignTarget.code} assigned to you`);
      setConfirmAssignTarget(null);
      handleRefresh();
    } catch (err) {
      if (err?.status === 409) {
        toast('Complaint was already modified, refreshing…', { icon: '🔄' });
        handleRefresh();
      } else {
        toast.error(err?.message || 'Failed to assign complaint');
      }
    } finally {
      setAssigning(false);
    }
  };

  const hasActiveFilters =
    statusParam !== 'All' ||
    priorityParam !== 'All' ||
    overdueParam ||
    searchParam.trim() !== '' ||
    sortParam !== 'dueAt';

  const clearAllFilters = () => {
    setSearchInput('');
    updateFilters({
      status: null,
      priority: null,
      overdue: null,
      search: null,
      sort: null,
      page: 1,
    });
  };

  const tabsList = [
    {
      id: 'assigned',
      label: 'Assigned to me',
      count: summaryLoading ? undefined : assignedCount,
    },
    {
      id: 'unassigned',
      label: `Unassigned (${user?.department || 'Department'})`,
      count: summaryLoading ? undefined : unassignedPoolCount,
    },
    {
      id: 'all',
      label: 'All Department Queue',
      count: summaryLoading ? undefined : assignedCount + unassignedPoolCount,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Grievance Officer Queue"
        subtitle={`Managing complaints for ${user?.department || 'Department'} • Logged in as ${user?.name}`}
        breadcrumbs={[{ label: 'Home', href: '/officer' }, { label: 'Officer Queue' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={handleRefresh}
            title="Refresh queue and stats"
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => updateFilters({ tab: 'assigned', status: null, overdue: null, page: 1 })}
          className={classNames(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-300',
            tabParam === 'assigned' && statusParam === 'All' && !overdueParam
              ? 'ring-2 ring-indigo-500 bg-indigo-50/20'
              : ''
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Assigned to Me
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="32px" className="mt-2" />
              ) : (
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {assignedCount}
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Active tickets under your responsibility</p>
        </Card>

        <Card
          onClick={() => updateFilters({ tab: 'assigned', status: 'In Progress', overdue: null, page: 1 })}
          className={classNames(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-amber-300',
            statusParam === 'In Progress' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                In Progress
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="32px" className="mt-2" />
              ) : (
                <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700">
                  {inProgressCount}
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Currently undergoing investigation</p>
        </Card>

        <Card
          onClick={() => updateFilters({ overdue: !overdueParam ? 'true' : null, page: 1 })}
          className={classNames(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-rose-300',
            overdueParam ? 'ring-2 ring-rose-500 bg-rose-50/40' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Overdue SLA
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="32px" className="mt-2" />
              ) : (
                <p className="mt-1 text-2xl font-bold tracking-tight text-rose-700">
                  {overdueCount}
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-rose-600 font-medium">
            {overdueCount > 0 ? 'Requires immediate attention' : 'All tickets within SLA target'}
          </p>
        </Card>

        <Card
          onClick={() => updateFilters({ tab: 'unassigned', status: null, overdue: null, page: 1 })}
          className={classNames(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-purple-300',
            tabParam === 'unassigned' ? 'ring-2 ring-purple-500 bg-purple-50/20' : ''
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Unassigned Pool
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="32px" className="mt-2" />
              ) : (
                <p className="mt-1 text-2xl font-bold tracking-tight text-purple-700">
                  {unassignedPoolCount}
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Inbox className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Awaiting department officer pickup</p>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        <Tabs tabs={tabsList} activeTab={tabParam} onChange={handleTabChange} variant="underline" />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or code (e.g. GRV-2026)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ search: null, page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-36">
              <Select
                id="filter-status"
                value={statusParam}
                onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
              >
                <option value="All">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-32">
              <Select
                id="filter-priority"
                value={priorityParam}
                onChange={(e) => updateFilters({ priority: e.target.value, page: 1 })}
              >
                <option value="All">All Priorities</option>
                {PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-48">
              <Select
                id="filter-sort"
                value={sortParam}
                onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
              >
                <option value="dueAt">Urgent First (SLA Due)</option>
                <option value="-dueAt">Furthest SLA Due</option>
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="priority">Priority: High to Low</option>
              </Select>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Toggle
                id="toggle-overdue"
                checked={overdueParam}
                onChange={(checked) => updateFilters({ overdue: checked ? 'true' : null, page: 1 })}
                label="Overdue only"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={clearAllFilters}
                className="text-slate-500 hover:text-slate-700"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {complaintsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">
              {complaintsError?.message || 'Failed to load complaints queue.'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {complaintsLoading && (
        <div className="space-y-4">
          <div className="hidden md:block">
            <ComplaintTable complaints={[]} loading={true} showFiler={true} showAssignee={true} />
          </div>
          <div className="md:hidden space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                <Skeleton width="40%" height="20px" className="mb-2" />
                <Skeleton width="90%" height="16px" className="mb-2" />
                <Skeleton width="60%" height="14px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!complaintsLoading && complaints && complaints.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <EmptyState
            icon={hasActiveFilters ? Filter : CheckCircle2}
            title={
              hasActiveFilters
                ? 'No matching complaints found'
                : tabParam === 'unassigned'
                ? 'Unassigned pool is empty'
                : 'No complaints in this queue'
            }
            description={
              hasActiveFilters
                ? 'Try adjusting your search criteria or removing active filters.'
                : tabParam === 'unassigned'
                ? 'All grievances in your department have been assigned.'
                : 'You currently have no active grievances assigned.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              ) : null
            }
          />
        </div>
      )}

      {!complaintsLoading && complaints && complaints.length > 0 && (
        <div className="space-y-4">
          <div className="hidden md:block">
            <ComplaintTable
              complaints={complaints}
              showFiler={true}
              showAssignee={tabParam !== 'assigned'}
              renderActions={(c) => {
                if (!c.assignedTo) {
                  return (
                    <Button
                      size="xs"
                      variant="outline"
                      icon={UserCheck}
                      onClick={() => setConfirmAssignTarget(c)}
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-medium whitespace-nowrap"
                    >
                      Assign to me
                    </Button>
                  );
                }
                return null;
              }}
            />
          </div>

          <div className="md:hidden space-y-3">
            {complaints.map((c) => (
              <ComplaintCard
                key={c._id}
                complaint={c}
                showFiler={true}
                showAssignee={tabParam !== 'assigned'}
                renderActions={
                  !c.assignedTo
                    ? (complaint) => (
                        <Button
                          size="xs"
                          variant="outline"
                          icon={UserCheck}
                          onClick={() => setConfirmAssignTarget(complaint)}
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-medium"
                        >
                          Assign to me
                        </Button>
                      )
                    : null
                }
              />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                itemsPerPage={meta.limit}
                onPageChange={(newPage) => updateFilters({ page: newPage })}
              />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmAssignTarget}
        onClose={() => setConfirmAssignTarget(null)}
        onConfirm={handleAssignToMe}
        loading={assigning}
        title="Assign Grievance to Yourself"
        message={
          confirmAssignTarget
            ? `Are you sure you want to assign grievance ${confirmAssignTarget.code} ("${confirmAssignTarget.title}") to yourself? It will be moved to Acknowledged and tracked under your queue.`
            : ''
        }
        confirmText="Confirm Assignment"
      />
    </div>
  );
}

export default OfficerQueuePage;
