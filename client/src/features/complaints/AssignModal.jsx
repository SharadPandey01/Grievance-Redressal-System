import { useState, useEffect } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Modal, Select, Textarea, FormField, Spinner } from '../../components/ui';
import { getOfficers } from '../../api/users';
import { assignComplaint } from '../../api/complaints';

export function AssignModal({ isOpen, onClose, complaint, user, onSuccess, onError, setLoading }) {
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAssigneeId('');
    setNote('');
    setLoadingOfficers(true);

    getOfficers({})
      .then((data) => setOfficers(data || []))
      .catch(() => toast.error('Failed to load officers'))
      .finally(() => setLoadingOfficers(false));
  }, [isOpen]);

  const handleAssignToMe = () => {
    if (user?._id) {
      setAssigneeId(user._id);
    }
  };

  const handleSubmit = async () => {
    if (!assigneeId) {
      toast.error('Please select an officer');
      return;
    }
    setSubmitting(true);
    if (setLoading) setLoading('assign');
    try {
      await assignComplaint(complaint._id, { assigneeId, note: note.trim() || undefined });
      onClose();
      if (onSuccess) {
        onSuccess('Complaint assigned successfully');
      }
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        toast.error(err?.message || 'Failed to assign complaint');
      }
    } finally {
      setSubmitting(false);
      if (setLoading) setLoading(null);
    }
  };

  const selectedOfficerName = officers.find((o) => o._id === assigneeId)?.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={complaint?.assignedTo ? 'Reassign Complaint' : 'Assign Complaint'}
      description="Select a grievance officer to handle this complaint."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            loading={submitting}
            disabled={!assigneeId}
            onClick={handleSubmit}
          >
            {complaint?.assignedTo ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {loadingOfficers ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" className="text-indigo-600" />
          </div>
        ) : (
          <>
            <FormField label="Assign to Officer" required id="assignee-select">
              <Select
                id="assignee-select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Select an officer…"
              >
                <option value="" disabled>Select an officer…</option>
                {officers.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name} — {o.department}
                  </option>
                ))}
              </Select>
            </FormField>

            {user?._id && officers.some((o) => o._id === user._id) && (
              <button
                type="button"
                onClick={handleAssignToMe}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign to me
                {assigneeId === user._id && (
                  <span className="text-emerald-600 font-bold">✓</span>
                )}
              </button>
            )}

            {selectedOfficerName && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-800">
                <span className="font-semibold">{selectedOfficerName}</span> will be notified and responsible for this complaint.
              </div>
            )}

            <FormField label="Note" hint="Optional" id="assign-note">
              <Textarea
                id="assign-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context for the assignment…"
                maxLength={500}
              />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}

export default AssignModal;
