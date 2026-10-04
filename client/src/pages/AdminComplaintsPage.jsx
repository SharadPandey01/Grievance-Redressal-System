import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Download,
  RotateCw,
  Search,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  PageHeader,
  Select,
  Pagination,
  EmptyState,
  Toggle,
  Skeleton,
} from '../components/ui';
import { ComplaintTable, ComplaintCard, AssignModal } from '../features/complaints';
import { getComplaints } from '../api/complaints';
import { getCategories } from '../api/categories';
import { getOfficers } from '../api/users';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { STATUSES, PRIORITIES } from '../lib/constants';

export function AdminComplaintsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status') || 'All';
  const priorityParam = searchParams.get('priority') || 'All';
  const categoryParam = searchParams.get('category') || 'All';
  const officerParam = searchParams.get('officer') || 'All';
  const overdueParam = searchParams.get('overdue') === 'true';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || '-createdAt';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limit = 10;

  const [searchInput, setSearchInput] = useState(searchParam);
  const [categories, setCategories] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [exporting, setExporting] = useState(false);

  const [selectedComplaintForAssign, setSelectedComplaintForAssign] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  useEffect(() => {
    let mounted = true;
    getCategories({ all: true })
      .then((data) => {
        if (mounted) setCategories(data || []);
      })
      .catch(() => {});

    getOfficers({})
      .then((data) => {
        if (mounted) setOfficers(data || []);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

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
              (key === 'sort' && value === '-createdAt')
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

  const fetchComplaints = useCallback(() => {
    const params = {
      page: pageParam,
      limit,
      sort: sortParam,
    };

    if (statusParam !== 'All') params.status = statusParam;
    if (priorityParam !== 'All') params.priority = priorityParam;
    if (categoryParam !== 'All') params.category = categoryParam;
    if (officerParam !== 'All') params.assignedTo = officerParam;
    if (overdueParam) params.overdue = 'true';
    if (searchParam.trim()) params.search = searchParam.trim();

    return getComplaints(params);
  }, [
    pageParam,
    limit,
    sortParam,
    statusParam,
    priorityParam,
    categoryParam,
    officerParam,
    overdueParam,
    searchParam,
  ]);

  const {
    data: complaints,
    meta,
    loading: complaintsLoading,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useFetch(
    fetchComplaints,
    [
      pageParam,
      sortParam,
      statusParam,
      priorityParam,
      categoryParam,
      officerParam,
      overdueParam,
      searchParam,
    ],
    { pollMs: 30000 }
  );

  const handleOpenAssign = (complaint) => {
    setSelectedComplaintForAssign(complaint);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = (msg) => {
    toast.success(msg || 'Assignment updated');
    refetchComplaints();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    toast('Preparing CSV export…', { icon: '⏳' });

    try {
      const exportParams = {
        sort: sortParam,
      };
      if (statusParam !== 'All') exportParams.status = statusParam;
      if (priorityParam !== 'All') exportParams.priority = priorityParam;
      if (categoryParam !== 'All') exportParams.category = categoryParam;
      if (officerParam !== 'All') exportParams.assignedTo = officerParam;
      if (overdueParam) exportParams.overdue = 'true';
      if (searchParam.trim()) exportParams.search = searchParam.trim();

      let pageNum = 1;
      let allRecords = [];
      const MAX_RECORDS = 1000;

      while (allRecords.length < MAX_RECORDS) {
        const res = await getComplaints({
          ...exportParams,
          page: pageNum,
          limit: 50,
        });

        const batch = res.data || [];
        if (batch.length === 0) break;

        allRecords.push(...batch);

        if (pageNum >= (res.meta?.totalPages || 1) || batch.length < 50) {
          break;
        }
        pageNum++;
      }

      if (allRecords.length === 0) {
        toast.error('No complaints match the criteria for export');
        setExporting(false);
        return;
      }

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        if (
          str.includes(',') ||
          str.includes('"') ||
          str.includes('\n') ||
          str.includes('\r')
        ) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const headers = [
        'Complaint Code',
        'Title',
        'Description',
        'Category',
        'Department',
        'Priority',
        'Status',
        'Filed By',
        'Assigned Officer',
        'Submitted Date',
        'SLA Target Date',
        'Is Overdue',
        'Reopen Count',
        'Resolution Notes',
        'Created At',
        'Updated At',
      ];

      const rows = allRecords.map((c) => {
        const categoryName = c.category?.name || c.category || '';
        const deptName = c.category?.department || '';
        const filerName = c.isAnonymous
          ? 'Anonymous'
          : c.filedBy?.name || c.filedByLabel || 'Complainant';
        const assigneeName = c.assignedTo?.name || 'Unassigned';

        return [
          escapeCell(c.code),
          escapeCell(c.title),
          escapeCell(c.description),
          escapeCell(categoryName),
          escapeCell(deptName),
          escapeCell(c.priority),
          escapeCell(c.status),
          escapeCell(filerName),
          escapeCell(assigneeName),
          escapeCell(c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''),
          escapeCell(c.dueAt ? new Date(c.dueAt).toLocaleDateString() : ''),
          escapeCell(c.isOverdue ? 'Yes' : 'No'),
          escapeCell(c.reopenCount || 0),
          escapeCell(c.resolutionNotes || ''),
          escapeCell(c.createdAt ? new Date(c.createdAt).toISOString() : ''),
          escapeCell(c.updatedAt ? new Date(c.updatedAt).toISOString() : ''),
        ].join(',');
      });

      const csvContent = [headers.map(escapeCell).join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.setAttribute(
        'download',
        `campus_complaints_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported ${allRecords.length} complaint${allRecords.length === 1 ? '' : 's'} to CSV`);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate CSV export');
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters =
    statusParam !== 'All' ||
    priorityParam !== 'All' ||
    categoryParam !== 'All' ||
    officerParam !== 'All' ||
    overdueParam ||
    searchParam.trim() !== '' ||
    sortParam !== '-createdAt';

  const clearAllFilters = () => {
    setSearchInput('');
    updateFilters({
      status: null,
      priority: null,
      category: null,
      officer: null,
      overdue: null,
      search: null,
      sort: null,
      page: 1,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Complaints Management"
        subtitle="Master repository of all campus grievances with assignment oversight and report export."
        breadcrumbs={[{ label: 'Home', href: '/admin' }, { label: 'Complaints Management' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCw}
              onClick={refetchComplaints}
              title="Refresh complaints list"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              loading={exporting}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or title…"
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

            <div className="w-44">
              <Select
                id="filter-category"
                value={categoryParam}
                onChange={(e) => updateFilters({ category: e.target.value, page: 1 })}
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-44">
              <Select
                id="filter-officer"
                value={officerParam}
                onChange={(e) => updateFilters({ officer: e.target.value, page: 1 })}
              >
                <option value="All">All Officers</option>
                {officers.map((off) => (
                  <option key={off._id} value={off._id}>
                    {off.name} ({off.department})
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-44">
              <Select
                id="filter-sort"
                value={sortParam}
                onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
              >
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="dueAt">Urgent First (SLA Due)</option>
                <option value="-dueAt">Furthest SLA Due</option>
                <option value="priority">Priority: High to Low</option>
              </Select>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Toggle
                id="toggle-overdue-admin"
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
              {complaintsError?.message || 'Failed to load complaints repository.'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={refetchComplaints}>
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
            title={hasActiveFilters ? 'No matching complaints found' : 'No complaints recorded'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters or search keywords.'
                : 'No grievances have been registered in the system yet.'
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
              showAssignee={true}
              renderActions={(c) => (
                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={ExternalLink}
                    onClick={() => navigate(`/complaints/${c._id}`)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Open
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    icon={UserPlus}
                    onClick={() => handleOpenAssign(c)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    {c.assignedTo ? 'Reassign' : 'Assign'}
                  </Button>
                </div>
              )}
            />
          </div>

          <div className="md:hidden space-y-3">
            {complaints.map((c) => (
              <ComplaintCard
                key={c._id}
                complaint={c}
                showFiler={true}
                showAssignee={true}
                renderActions={(complaint) => (
                  <div className="flex items-center justify-end gap-2 w-full pt-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={ExternalLink}
                      onClick={() => navigate(`/complaints/${complaint._id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      icon={UserPlus}
                      onClick={() => handleOpenAssign(complaint)}
                    >
                      {complaint.assignedTo ? 'Reassign' : 'Assign'}
                    </Button>
                  </div>
                )}
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

      {selectedComplaintForAssign && (
        <AssignModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedComplaintForAssign(null);
          }}
          complaint={selectedComplaintForAssign}
          user={user}
          role={role}
          onSuccess={handleAssignSuccess}
          onError={(err) => {
            if (err?.status === 409) {
              toast('Complaint was already modified, refreshing…', { icon: '🔄' });
              refetchComplaints();
            } else {
              toast.error(err?.message || 'Assignment failed');
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminComplaintsPage;
