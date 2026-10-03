import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  Archive,
  Search,
  X,
  RotateCw,
  AlertCircle,
  Inbox,
  Filter,
} from 'lucide-react';
import {
  Button,
  Card,
  PageHeader,
  Badge,
  Select,
  Tabs,
  Pagination,
  Skeleton,
  EmptyState,
} from '../components/ui';
import { ComplaintTable, ComplaintCard } from '../features/complaints';
import { getComplaints } from '../api/complaints';
import { getMySummary } from '../api/analytics';
import { getCategories } from '../api/categories';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { PRIORITIES } from '../lib/constants';
import { classNames } from '../lib/classNames';

export function DashboardPage() {
  const { user, role } = useAuth();

  // Filters and search state
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortParam, setSortParam] = useState('-createdAt');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Categories for dropdown filter
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((data) => {
        if (mounted) setCategories(data || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Hand-written debounce with setTimeout inside useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  // Fetch role-aware summary analytics (polling every 30s)
  const fetchSummary = useCallback(() => getMySummary(), []);
  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useFetch(fetchSummary, [], { pollMs: 30000 });

  // Calculate stats from summaryData
  const statusCounts = (summaryData?.byStatus || []).reduce((acc, item) => {
    acc[item.status] = item.count;
    return acc;
  }, {});

  const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const openCount =
    (statusCounts['Submitted'] || 0) +
    (statusCounts['Acknowledged'] || 0) +
    (statusCounts['In Progress'] || 0);
  const awaitingVerificationCount =
    summaryData?.awaitingVerification !== undefined
      ? summaryData.awaitingVerification
      : statusCounts['Resolved'] || 0;
  const closedCount = statusCounts['Closed'] || 0;

  // Fetch complaints list with useFetch and 30s poll
  const fetchComplaints = useCallback(() => {
    const params = {
      page,
      limit,
      sort: sortParam,
    };
    if (statusFilter !== 'All') params.status = statusFilter;
    if (priorityFilter !== 'All') params.priority = priorityFilter;
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

    return getComplaints(params);
  }, [page, limit, sortParam, statusFilter, priorityFilter, categoryFilter, debouncedSearch]);

  const {
    data: complaints,
    meta,
    loading: complaintsLoading,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useFetch(
    fetchComplaints,
    [page, sortParam, statusFilter, priorityFilter, categoryFilter, debouncedSearch],
    { pollMs: 30000 }
  );

  const handleRefreshAll = () => {
    refetchSummary();
    refetchComplaints();
  };

  const handleClearFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
    setSearchInput('');
    setDebouncedSearch('');
    setSortParam('-createdAt');
    setPage(1);
  };

  const isFiltered =
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    categoryFilter !== 'All' ||
    debouncedSearch !== '';

  // Tabs for status filtering
  const statusTabs = [
    { id: 'All', label: 'All Complaints', count: totalCount },
    { id: 'Submitted', label: 'Submitted', count: statusCounts['Submitted'] || 0 },
    { id: 'Acknowledged', label: 'Acknowledged', count: statusCounts['Acknowledged'] || 0 },
    { id: 'In Progress', label: 'In Progress', count: statusCounts['In Progress'] || 0 },
    { id: 'Resolved', label: 'Resolved', count: statusCounts['Resolved'] || 0 },
    { id: 'Closed', label: 'Closed', count: statusCounts['Closed'] || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={`Welcome back, ${user?.name || 'Complainant'}`}
        description="Track your active grievances, monitor real-time SLA progress, and verify resolutions."
        badge={
          <Badge variant="indigo" dot>
            {role === 'staff' ? 'Staff Portal' : 'Student Portal'}
          </Badge>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCw}
              onClick={handleRefreshAll}
              title="Refresh complaints and metrics"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to="/complaints/new">
              <Button variant="primary" icon={PlusCircle}>
                File a Complaint
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card
          hover
          className="cursor-pointer transition-all hover:border-indigo-300"
          onClick={() => {
            setStatusFilter('All');
            setPage(1);
          }}
        >
          <Card.Content className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Filed
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="28px" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900">{totalCount}</h3>
              )}
              <p className="text-xs text-slate-400">All submitted grievances</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileText className="h-6 w-6" />
            </div>
          </Card.Content>
        </Card>

        {/* Open */}
        <Card
          hover
          className="cursor-pointer transition-all hover:border-amber-300"
          onClick={() => {
            setStatusFilter('In Progress');
            setPage(1);
          }}
        >
          <Card.Content className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                In Resolution
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="28px" />
              ) : (
                <h3 className="text-2xl font-bold text-amber-600">{openCount}</h3>
              )}
              <p className="text-xs text-slate-400">Under officer review</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="h-6 w-6" />
            </div>
          </Card.Content>
        </Card>

        {/* Awaiting Verification (HIGHLIGHTED & CLICKABLE) */}
        <Card
          hover
          className={classNames(
            'cursor-pointer transition-all duration-200 relative overflow-hidden',
            awaitingVerificationCount > 0
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-white ring-2 ring-emerald-500/20 shadow-md hover:shadow-lg'
              : 'hover:border-emerald-200'
          )}
          onClick={() => {
            setStatusFilter('Resolved');
            setPage(1);
          }}
        >
          {awaitingVerificationCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          <Card.Content className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Awaiting Verification
                </p>
                {awaitingVerificationCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    Action
                  </span>
                )}
              </div>
              {summaryLoading ? (
                <Skeleton width="48px" height="28px" />
              ) : (
                <h3 className="text-2xl font-bold text-emerald-700">
                  {awaitingVerificationCount}
                </h3>
              )}
              <p className="text-xs text-emerald-600 font-medium">
                {awaitingVerificationCount > 0
                  ? 'Click to review & close'
                  : 'No pending verifications'}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle className="h-6 w-6" />
            </div>
          </Card.Content>
        </Card>

        {/* Closed */}
        <Card
          hover
          className="cursor-pointer transition-all hover:border-slate-300"
          onClick={() => {
            setStatusFilter('Closed');
            setPage(1);
          }}
        >
          <Card.Content className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Closed History
              </p>
              {summaryLoading ? (
                <Skeleton width="48px" height="28px" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-700">{closedCount}</h3>
              )}
              <p className="text-xs text-slate-400">Resolved & verified</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <Archive className="h-6 w-6" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* ── Main Complaints Section ───────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <Card.Header className="bg-white border-b border-slate-200 pb-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Card.Title>My Grievances</Card.Title>
              <Card.Description>
                Live tracker of all complaints filed by your account.
              </Card.Description>
            </div>

            {/* Quick Status Tabs */}
            <Tabs
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(newStatus) => {
                setStatusFilter(newStatus);
                setPage(1);
              }}
              variant="underline"
            />
          </div>
        </Card.Header>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Debounced Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'All', label: 'All Categories' },
              ...categories.map((c) => ({
                value: c._id,
                label: `${c.name} (${c.department})`,
              })),
            ]}
          />

          {/* Priority Filter */}
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'All', label: 'All Priorities' },
              ...PRIORITIES.map((p) => ({ value: p, label: `${p} Priority` })),
            ]}
          />

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <Select
              value={sortParam}
              onChange={(e) => {
                setSortParam(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '-createdAt', label: 'Newest First' },
                { value: 'createdAt', label: 'Oldest First' },
                { value: 'dueAt', label: 'Due Date (Soonest)' },
                { value: '-dueAt', label: 'Due Date (Latest)' },
                { value: '-priority', label: 'High Priority First' },
              ]}
            />
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 whitespace-nowrap"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── Table & Cards Content ─────────────────────────────────────────────── */}
        <Card.Content className="p-0 sm:p-0">
          {/* Error State */}
          {complaintsError && (
            <div className="m-6 rounded-xl border border-rose-200 bg-rose-50/60 p-5 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-rose-700 font-semibold">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load complaints</span>
              </div>
              <p className="text-xs text-rose-600 max-w-md mx-auto">
                {complaintsError.message || 'An unexpected error occurred while fetching your data.'}
              </p>
              <Button variant="outline" size="sm" onClick={refetchComplaints} icon={RotateCw}>
                Retry Fetching
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {complaintsLoading && !complaintsError && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Desktop Table Skeleton */}
              <div className="hidden md:block">
                <ComplaintTable loading={true} />
              </div>
              {/* Mobile Cards Skeleton */}
              <div className="block md:hidden space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex justify-between">
                      <Skeleton width="90px" height="20px" />
                      <Skeleton width="80px" height="20px" />
                    </div>
                    <Skeleton width="80%" height="16px" />
                    <Skeleton width="40%" height="12px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loaded Content */}
          {!complaintsLoading && !complaintsError && (
            <>
              {(!complaints || complaints.length === 0) ? (
                <div className="p-8">
                  {isFiltered ? (
                    <EmptyState
                      icon={Filter}
                      title="No matching complaints"
                      description="We couldn't find any complaints matching your active filters or search terms."
                      action={
                        <Button variant="outline" size="sm" onClick={handleClearFilters}>
                          Clear All Filters
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Inbox}
                      title="No complaints filed yet"
                      description="You haven't filed any grievances. If you face any campus or hostel issues, submit one anytime."
                      action={
                        <Link to="/complaints/new">
                          <Button variant="primary" icon={PlusCircle}>
                            File Your First Complaint
                          </Button>
                        </Link>
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Desktop View: Table */}
                  <div className="hidden md:block">
                    <ComplaintTable complaints={complaints} />
                  </div>

                  {/* Mobile View: Stacked Cards */}
                  <div className="block md:hidden space-y-3">
                    {complaints.map((c) => (
                      <ComplaintCard key={c._id} complaint={c} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {meta && meta.totalPages > 1 && (
                    <div className="pt-4 border-t border-slate-100">
                      <Pagination
                        page={page}
                        totalPages={meta.totalPages}
                        totalItems={meta.total}
                        limit={limit}
                        onPageChange={(newPage) => setPage(newPage)}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}

export default DashboardPage;
