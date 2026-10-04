import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  ArrowRightCircle,
  CheckCircle2,
  RotateCcw,
  Star,
  Info,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Modal,
  ConfirmDialog,
  Select,
  Textarea,
  FormField,
  StarRating,
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { AssignModal } from './AssignModal';
import {
  updateComplaintStatus,
  verifyComplaint,
  reopenComplaint,
  submitFeedback,
} from '../../api/complaints';
import { COMPLAINANT_ROLES } from '../../lib/constants';

function getNextHint(status, role, allowedActions) {
  const isComplainant = COMPLAINANT_ROLES.includes(role);

  if (status === 'Submitted') {
    if (isComplainant) return 'Your grievance has been received. A grievance officer will be assigned shortly.';
    return 'Assign this complaint to a grievance officer to begin processing.';
  }
  if (status === 'Acknowledged') {
    if (isComplainant) return 'An officer has been assigned and will begin investigating your complaint.';
    return 'Mark as In Progress once you begin investigating this complaint.';
  }
  if (status === 'In Progress') {
    if (isComplainant) return 'The assigned officer is actively working on your complaint.';
    return 'Once resolved, mark as Resolved with resolution notes. The complainant will be asked to verify.';
  }
  if (status === 'Resolved') {
    if (isComplainant) return 'Please verify the resolution. You can close it or reopen if unsatisfied.';
    return 'Waiting for the complainant to verify and close this resolution.';
  }
  if (status === 'Closed') {
    if (isComplainant && allowedActions.includes('feedback')) return 'This complaint is closed. You can rate the resolution experience.';
    return 'This complaint has been resolved and closed.';
  }
  return '';
}

export function ComplaintActions({ complaint, onChanged }) {
  const { user, role } = useAuth();

  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  const allowedActions = complaint?.allowedActions || [];
  const allowedNextStatuses = complaint?.allowedNextStatuses || [];

  const handleError = useCallback((err) => {
    if (err?.status === 409) {
      toast('This complaint changed, refreshing…', { icon: '🔄' });
      onChanged?.();
    } else {
      toast.error(err?.message || 'Something went wrong');
    }
  }, [onChanged]);

  const handleSuccess = useCallback((msg) => {
    toast.success(msg || 'Action completed');
    onChanged?.();
  }, [onChanged]);

  if (!complaint || allowedActions.length === 0 && !(complaint.status === 'Closed')) {
    const hint = complaint ? getNextHint(complaint.status, role, allowedActions) : '';
    if (!hint) return null;
    return (
      <div className="flex items-start gap-1.5 text-xs text-slate-500 max-w-md">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
        <span>{hint}</span>
      </div>
    );
  }

  const showFeedbackButton = allowedActions.includes('feedback');

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {allowedActions.includes('assign') && (
          <Button
            variant="outline"
            size="sm"
            icon={UserPlus}
            loading={actionLoading === 'assign'}
            disabled={!!actionLoading}
            onClick={() => setAssignOpen(true)}
          >
            {complaint.assignedTo ? 'Reassign' : 'Assign'}
          </Button>
        )}

        {allowedActions.includes('updateStatus') && (
          <Button
            variant="primary"
            size="sm"
            icon={ArrowRightCircle}
            loading={actionLoading === 'updateStatus'}
            disabled={!!actionLoading}
            onClick={() => setStatusOpen(true)}
          >
            Update Status
          </Button>
        )}

        {allowedActions.includes('verify') && (
          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            loading={actionLoading === 'verify'}
            disabled={!!actionLoading}
            onClick={() => setVerifyOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500"
          >
            Verify &amp; Close
          </Button>
        )}

        {allowedActions.includes('reopen') && (
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            loading={actionLoading === 'reopen'}
            disabled={!!actionLoading}
            onClick={() => setReopenOpen(true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Reopen
          </Button>
        )}

        {showFeedbackButton && (
          <Button
            variant="outline"
            size="sm"
            icon={Star}
            loading={actionLoading === 'feedback'}
            disabled={!!actionLoading}
            onClick={() => setFeedbackOpen(true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Rate this resolution
          </Button>
        )}
      </div>

      {complaint && (
        <div className="flex items-start gap-1.5 text-xs text-slate-500 max-w-sm text-right">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          <span>{getNextHint(complaint.status, role, allowedActions)}</span>
        </div>
      )}

      <AssignModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        complaint={complaint}
        user={user}
        role={role}
        onSuccess={handleSuccess}
        onError={handleError}
        setLoading={setActionLoading}
      />

      <UpdateStatusModal
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        complaint={complaint}
        allowedNextStatuses={allowedNextStatuses}
        onSuccess={handleSuccess}
        onError={handleError}
        setLoading={setActionLoading}
      />

      <VerifyDialog
        isOpen={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        complaint={complaint}
        onSuccess={(msg) => {
          handleSuccess(msg);
          setFeedbackOpen(true);
        }}
        onError={handleError}
        setLoading={setActionLoading}
      />

      <ReopenModal
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        complaint={complaint}
        onSuccess={handleSuccess}
        onError={handleError}
        setLoading={setActionLoading}
      />

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        complaint={complaint}
        onSuccess={handleSuccess}
        onError={handleError}
        setLoading={setActionLoading}
      />
    </div>
  );
}

export { AssignModal };

function UpdateStatusModal({ isOpen, onClose, complaint, allowedNextStatuses, onSuccess, onError, setLoading }) {
  const [toStatus, setToStatus] = useState('');
  const [note, setNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setToStatus(allowedNextStatuses.length === 1 ? allowedNextStatuses[0] : '');
      setNote('');
      setResolutionNotes('');
      setErrors({});
    }
  }, [isOpen, allowedNextStatuses]);

  const isResolving = toStatus === 'Resolved';

  const validate = () => {
    const errs = {};
    const trimNote = note.trim();
    if (trimNote.length < 3 || trimNote.length > 500) {
      errs.note = 'Note must be between 3 and 500 characters';
    }
    if (isResolving) {
      const trimRes = resolutionNotes.trim();
      if (trimRes.length < 1 || trimRes.length > 2000) {
        errs.resolutionNotes = 'Resolution notes are required (1-2000 characters)';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setLoading('updateStatus');
    try {
      await updateComplaintStatus(complaint._id, {
        toStatus,
        note: note.trim(),
        resolutionNotes: isResolving ? resolutionNotes.trim() : undefined,
      });
      onClose();
      onSuccess(`Status updated to ${toStatus}`);
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
      setLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Update Complaint Status"
      description={`Current status: ${complaint?.status}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={ArrowRightCircle}
            loading={submitting}
            disabled={!toStatus}
            onClick={handleSubmit}
          >
            Update to {toStatus || '…'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {allowedNextStatuses.length > 1 ? (
          <FormField label="New Status" required id="status-select">
            <Select
              id="status-select"
              value={toStatus}
              onChange={(e) => setToStatus(e.target.value)}
              placeholder="Select target status…"
              options={allowedNextStatuses.map((s) => ({ value: s, label: s }))}
            />
          </FormField>
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm">
            Advancing to: <span className="font-bold text-slate-900">{toStatus}</span>
          </div>
        )}

        <FormField
          label="Note"
          required
          id="status-note"
          error={errors.note}
          hint={`${note.length}/500`}
        >
          <Textarea
            id="status-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the progress or reason for this change…"
            maxLength={500}
            error={!!errors.note}
          />
        </FormField>

        {isResolving && (
          <>
            <FormField
              label="Resolution Notes"
              required
              id="resolution-notes"
              error={errors.resolutionNotes}
              hint={`${resolutionNotes.length}/2000`}
            >
              <Textarea
                id="resolution-notes"
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the issue was resolved…"
                maxLength={2000}
                error={!!errors.resolutionNotes}
              />
            </FormField>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>The complainant will be asked to verify this resolution. They can either close the complaint or reopen it if unsatisfied.</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function VerifyDialog({ isOpen, onClose, complaint, onSuccess, onError, setLoading }) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    setLoading('verify');
    try {
      await verifyComplaint(complaint._id);
      onClose();
      onSuccess('Complaint verified and closed');
    } catch (err) {
      onClose();
      onError(err);
    } finally {
      setSubmitting(false);
      setLoading(null);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Verify & Close Complaint"
      message="Are you satisfied with the resolution? This will close the complaint permanently. You'll be able to rate the resolution experience next."
      confirmText="Yes, Close Complaint"
      cancelText="Not yet"
      variant="info"
      loading={submitting}
    />
  );
}

function ReopenModal({ isOpen, onClose, complaint, onSuccess, onError, setLoading }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10 || trimmed.length > 500) {
      setError('Reason must be between 10 and 500 characters');
      return;
    }
    setSubmitting(true);
    setLoading('reopen');
    try {
      await reopenComplaint(complaint._id, { reason: trimmed });
      onClose();
      onSuccess('Complaint reopened — status returned to In Progress');
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
      setLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Reopen Complaint"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon={RotateCcw}
            loading={submitting}
            onClick={handleSubmit}
          >
            Reopen Complaint
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">This will return the complaint to In Progress.</p>
            <p className="mt-1">The assigned officer will be notified to re-investigate your issue.</p>
          </div>
        </div>

        <FormField
          label="Reason for reopening"
          required
          id="reopen-reason"
          error={error}
          hint={`${reason.length}/500`}
        >
          <Textarea
            id="reopen-reason"
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Explain why the resolution was not satisfactory…"
            maxLength={500}
            error={!!error}
          />
        </FormField>
      </div>
    </Modal>
  );
}

function FeedbackModal({ isOpen, onClose, complaint, onSuccess, onError, setLoading }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setComment('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5');
      return;
    }
    setSubmitting(true);
    setLoading('feedback');
    try {
      await submitFeedback(complaint._id, {
        rating,
        comment: comment.trim() || undefined,
      });
      onClose();
      onSuccess('Thank you for your feedback!');
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
      setLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Rate This Resolution"
      description="How satisfied are you with how your complaint was handled?"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Skip
          </Button>
          <Button
            variant="primary"
            icon={Star}
            loading={submitting}
            disabled={rating === 0}
            onClick={handleSubmit}
            className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-amber-400"
          >
            Submit Rating
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-3">
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
          />
          <span className="text-sm font-medium text-slate-600">
            {rating === 0 && 'Tap a star to rate'}
            {rating === 1 && 'Very Unsatisfied'}
            {rating === 2 && 'Unsatisfied'}
            {rating === 3 && 'Neutral'}
            {rating === 4 && 'Satisfied'}
            {rating === 5 && 'Very Satisfied'}
          </span>
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>

        <FormField label="Comment" hint="Optional · max 500 chars" id="feedback-comment">
          <Textarea
            id="feedback-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share any additional thoughts…"
            maxLength={500}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default ComplaintActions;
