import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Building,
  User,
  Shield,
  RotateCw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  Button,
  StatusBadge,
  PriorityBadge,
  StarRating,
  Skeleton,
  Spinner,
} from '../components/ui';
import {
  ComplaintActions,
  StatusTimeline,
  CommentsThread,
} from '../features/complaints';
import { ForbiddenPage } from './ForbiddenPage';
import { NotFoundPage } from './NotFoundPage';
import { getComplaintById, downloadAttachment } from '../api/complaints';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { formatDate, formatDateTime, formatFileSize } from '../lib/format';

export function ComplaintDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();

  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);

  // Determine back route by user role
  const backHref =
    role === 'officer'
      ? '/officer'
      : role === 'admin'
      ? '/admin/complaints'
      : '/dashboard';

  const backLabel =
    role === 'officer'
      ? 'Officer Queue'
      : role === 'admin'
      ? 'All Complaints'
      : 'My Complaints';

  // Fetch complaint details with useFetch (30s polling)
  const fetchComplaint = useCallback(() => {
    return getComplaintById(id);
  }, [id]);

  const {
    data: complaint,
    loading,
    error,
    refetch,
  } = useFetch(fetchComplaint, [id], { pollMs: 30000 });

  // Copy code helper
  const handleCopyCode = () => {
    if (!complaint?.code) return;
    navigator.clipboard.writeText(complaint.code);
    setCopiedCode(true);
    toast.success('Complaint tracking code copied');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download authenticated attachment
  const handleDownload = async (file) => {
    const filename = file.filename;
    const originalName = file.originalName || filename;

    setDownloadingFile(filename);
    try {
      const blobData = await downloadAttachment(complaint._id, filename);
      const url = window.URL.createObjectURL(new Blob([blobData]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${originalName}`);
    } catch (err) {
      toast.error(err.message || 'Failed to download attachment');
    } finally {
      setDownloadingFile(null);
    }
  };

  // ─── 403 Forbidden State ──────────────────────────────────────────────────
  if (error && (error.status === 403 || error.statusCode === 403)) {
    return <ForbiddenPage />;
  }

  // ─── 404 Not Found State ──────────────────────────────────────────────────
  if (error && (error.status === 404 || error.statusCode === 404)) {
    return <NotFoundPage />;
  }

  // ─── Generic Error State ──────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Failed to Load Grievance</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {error.message || 'We could not load the requested grievance details.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to={backHref}>
            <Button variant="outline" icon={ArrowLeft}>
              Back to {backLabel}
            </Button>
          </Link>
          <Button variant="primary" icon={RotateCw} onClick={refetch}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
  if (loading || !complaint) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton width="140px" height="24px" />
          <Skeleton width="100px" height="36px" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton width="120px" height="24px" />
              <Skeleton width="70%" height="28px" />
            </div>
            <div className="flex gap-2">
              <Skeleton width="80px" height="28px" />
              <Skeleton width="90px" height="28px" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton variant="card" height="200px" />
            <Skeleton variant="card" height="300px" />
          </div>
          <div className="space-y-6">
            <Skeleton variant="card" height="260px" />
            <Skeleton variant="card" height="360px" />
          </div>
        </div>
      </div>
    );
  }

  // Derived properties
  const isOverdue = !!complaint.isOverdue;

  const isAnonymous =
    complaint.isAnonymous ||
    !complaint.filedBy ||
    complaint.filedByLabel === 'Anonymous';

  const categoryName = complaint.category?.name || 'General Grievance';
  const departmentName = complaint.category?.department;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header with Back Navigation ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {backLabel}</span>
        </Link>

        {/* Phase F5 Workflow Actions Placeholder */}
        <div className="flex items-center gap-2">
          <ComplaintActions complaint={complaint} onChanged={refetch} />
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={refetch}
            title="Refresh complaint details"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Main Grievance Banner Header ────────────────────────────────────── */}
      <Card className="border-slate-200 bg-white overflow-hidden shadow-xs">
        <Card.Content className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Code & SLA Due Info */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 shadow-2xs">
                  <span>{complaint.code}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-indigo-600 focus-visible:outline-none"
                    title="Copy code"
                  >
                    {copiedCode ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <PriorityBadge priority={complaint.priority} size="md" />
                <StatusBadge status={complaint.status} size="md" />

                {isOverdue && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200 animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Overdue SLA
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug break-words">
                {complaint.title}
              </h1>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Filed on {formatDate(complaint.createdAt)}
                </span>
                {complaint.dueAt && !['Resolved', 'Closed'].includes(complaint.status) && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    SLA Target: {formatDate(complaint.dueAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* ── Two-Column Layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Column (2 spans on desktop) ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grievance Description Card */}
          <Card>
            <Card.Header className="pb-3">
              <Card.Title className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Grievance Description</span>
              </Card.Title>
            </Card.Header>
            <Card.Content className="pt-2 text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
              {complaint.description}
            </Card.Content>
          </Card>

          {/* Resolution Notes Callout (when present) */}
          {(complaint.resolutionNotes || complaint.resolvedAt) && (
            <div className="rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Official Resolution Summary</span>
                </div>
                {complaint.resolvedAt && (
                  <span className="text-xs text-emerald-700 font-medium">
                    Resolved {formatDate(complaint.resolvedAt)}
                  </span>
                )}
              </div>

              {complaint.resolutionNotes ? (
                <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-lg border border-emerald-200/70">
                  {complaint.resolutionNotes}
                </p>
              ) : (
                <p className="text-xs text-emerald-800 italic">
                  Marked as resolved by grievance authority.
                </p>
              )}
            </div>
          )}

          {/* Attachments Card (when present) */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <Card>
              <Card.Header className="pb-3">
                <Card.Title className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span>Supporting Attachments</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {complaint.attachments.length} {complaint.attachments.length === 1 ? 'file' : 'files'}
                  </span>
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-2">
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">
                  {complaint.attachments.map((file, idx) => {
                    const isPdf =
                      file.mimetype === 'application/pdf' ||
                      (file.originalName && file.originalName.toLowerCase().endsWith('.pdf'));
                    const isDownloading = downloadingFile === file.filename;

                    return (
                      <li
                        key={file.filename || idx}
                        className="flex items-center justify-between p-3.5 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                            {isPdf ? (
                              <FileText className="h-5 w-5 text-rose-600" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-medium text-slate-900 truncate text-xs sm:text-sm">
                              {file.originalName || file.filename}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDownloading}
                          icon={isDownloading ? Spinner : Download}
                          onClick={() => handleDownload(file)}
                        >
                          <span className="hidden sm:inline">
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card.Content>
            </Card>
          )}

          {/* Comments and Discussion Thread */}
          <CommentsThread
            complaintId={complaint._id}
            isClosed={complaint.status === 'Closed'}
          />
        </div>

        {/* ── Side Column (1 span on desktop) ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Metadata & Assignment Details Card */}
          <Card>
            <Card.Header className="pb-3">
              <Card.Title className="text-base">Grievance Overview</Card.Title>
            </Card.Header>
            <Card.Content className="pt-2 divide-y divide-slate-100 text-xs">
              {/* Category */}
              <div className="py-2.5 flex justify-between gap-2">
                <span className="text-slate-500 font-medium">Category</span>
                <span className="font-semibold text-slate-900 text-right">
                  {categoryName}
                </span>
              </div>

              {/* Department */}
              {departmentName && (
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1 text-right">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {departmentName}
                  </span>
                </div>
              )}

              {/* Filed By */}
              <div className="py-2.5 flex justify-between gap-2">
                <span className="text-slate-500 font-medium">Filed By</span>
                <span className="font-semibold text-slate-900 text-right flex items-center gap-1">
                  {isAnonymous ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Shield className="h-3 w-3" />
                      Anonymous
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {complaint.filedBy?.name || 'Complainant'}
                    </span>
                  )}
                </span>
              </div>

              {/* Assigned Handler */}
              <div className="py-2.5 flex justify-between gap-2">
                <span className="text-slate-500 font-medium">Assigned Officer</span>
                <span className="font-semibold text-slate-900 text-right">
                  {complaint.assignedTo?.name ? (
                    <span className="text-indigo-700 font-medium">
                      {complaint.assignedTo.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </span>
              </div>

              {/* Created Date */}
              <div className="py-2.5 flex justify-between gap-2">
                <span className="text-slate-500 font-medium">Created On</span>
                <span className="text-slate-700 text-right">
                  {formatDateTime(complaint.createdAt)}
                </span>
              </div>

              {/* Last Updated */}
              <div className="py-2.5 flex justify-between gap-2">
                <span className="text-slate-500 font-medium">Last Modified</span>
                <span className="text-slate-700 text-right">
                  {formatDateTime(complaint.updatedAt)}
                </span>
              </div>

              {/* Reopen Count */}
              {complaint.reopenCount > 0 && (
                <div className="py-2.5 flex justify-between gap-2 items-center">
                  <span className="text-slate-500 font-medium">Reopen Count</span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {complaint.reopenCount} {complaint.reopenCount === 1 ? 'time' : 'times'}
                  </span>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Status Timeline */}
          <StatusTimeline
            status={complaint.status}
            statusLogs={complaint.statusLogs || []}
          />

          {/* Complainant Feedback Card (when present) */}
          {complaint.feedback && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/40 to-white shadow-xs">
              <Card.Header className="pb-2">
                <Card.Title className="text-base flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Complainant Satisfaction</span>
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <StarRating value={complaint.feedback.rating} readOnly size="md" />
                  <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {complaint.feedback.rating} / 5
                  </span>
                </div>

                {complaint.feedback.comment && (
                  <p className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-amber-100 leading-relaxed italic">
                    "{complaint.feedback.comment}"
                  </p>
                )}

                <p className="text-[11px] text-slate-400 text-right">
                  Submitted {formatDate(complaint.feedback.createdAt)}
                </p>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComplaintDetailPage;
