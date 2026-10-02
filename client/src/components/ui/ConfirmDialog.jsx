import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="md"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isDanger ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          {message && (
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
