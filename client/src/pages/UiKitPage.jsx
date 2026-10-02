import { useState } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Mail,
  User,
  FolderPlus,
  Sparkles,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Input,
  Textarea,
  Select,
  Toggle,
  FormField,
  Card,
  Badge,
  StatusBadge,
  PriorityBadge,
  Modal,
  ConfirmDialog,
  Spinner,
  Skeleton,
  EmptyState,
  Pagination,
  Tabs,
  StarRating,
  PageHeader,
} from '../components/ui';
import { STATUSES, PRIORITIES, ROLES } from '../lib/constants';
import { useAuth } from '../hooks/useAuth';

export function UiKitPage() {
  const { role, user, setManualUser } = useAuth();

  // State for interactive component demos
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [activePillTab, setActivePillTab] = useState('all');
  const [page, setPage] = useState(2);
  const [toggleState, setToggleState] = useState(true);
  const [starValue, setStarValue] = useState(4);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);

  const handleSimulateRole = (newRole) => {
    if (!newRole) {
      setManualUser(null);
      toast.success('Switched to Visitor / Guest view');
      return;
    }
    const mockUsers = {
      student: { name: 'Alice Student', role: 'student', email: 'alice@campus.edu' },
      staff: { name: 'Bob Staff', role: 'staff', email: 'bob@campus.edu' },
      officer: { name: 'Prof. Rao', role: 'officer', email: 'officer.hostel@campus.edu', department: 'Hostel' },
      admin: { name: 'System Admin', role: 'admin', email: 'admin@campus.edu' },
    };
    setManualUser(mockUsers[newRole]);
    toast.success(`Role switched to: ${newRole}`);
  };

  const handleConfirmAction = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      toast.success('Action confirmed successfully!');
    }, 1000);
  };

  return (
    <div className="space-y-12 pb-16">
      <PageHeader
        title="UI Component Kit"
        description="Comprehensive design system showcase and reusable foundation testing playground."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Development', href: '#' },
          { label: 'UI Kit' },
        ]}
        badge={<Badge variant="indigo">F1 Foundation</Badge>}
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => toast.success('Header action clicked!')}
          >
            New Action
          </Button>
        }
      />

      {/* Role Switcher Toolbar */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white">
        <Card.Header>
          <Card.Title className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Active Role Simulator for Sidebar & Layout Testing
          </Card.Title>
          <Card.Description>
            Current user: <span className="font-semibold text-slate-800">{user?.name || 'Guest'}</span> ({role || 'none'})
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((r) => (
              <Button
                key={r}
                variant={role === r ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleSimulateRole(r)}
              >
                {r.toUpperCase()}
              </Button>
            ))}
            <Button
              variant={!role ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleSimulateRole(null)}
            >
              Visitor / Guest
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* 1. Buttons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          1. Buttons (Variants, Sizes & States)
        </h2>
        <Card>
          <Card.Content className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Variants
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Sizes & Icons
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" icon={Send}>Small with Icon</Button>
                <Button size="md" icon={Send}>Medium Default</Button>
                <Button size="lg" icon={Send}>Large Button</Button>
                <Button variant="danger" size="md" icon={Trash2}>Delete</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Loading & Disabled States
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  loading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1500);
                  }}
                >
                  {btnLoading ? 'Submitting...' : 'Click to test loading'}
                </Button>
                <Button variant="secondary" loading>Saving</Button>
                <Button variant="danger" loading>Deleting</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* 2. Badges & Indicators */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          2. Badges, Statuses & Priorities
        </h2>
        <Card>
          <Card.Content className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Complaint Status Badges
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {STATUSES.map((status) => (
                  <StatusBadge key={status} status={status} size="md" />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Priority Badges
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {PRIORITIES.map((priority) => (
                  <PriorityBadge key={priority} priority={priority} size="md" />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Generic Badges & Dots
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="indigo" dot>Indigo</Badge>
                <Badge variant="emerald" dot>Emerald</Badge>
                <Badge variant="amber" dot>Amber</Badge>
                <Badge variant="rose" dot>Rose</Badge>
                <Badge variant="sky" dot>Sky</Badge>
                <Badge variant="purple" dot>Purple</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* 3. Form Controls */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          3. Form Controls & Validation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <Card.Header>
              <Card.Title className="text-base">Input & Select Fields</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <FormField label="Full Name" required id="ui-name" hint="As shown on campus ID">
                <Input
                  id="ui-name"
                  placeholder="e.g. Rahul Sharma"
                  icon={User}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </FormField>

              <FormField
                label="Campus Email"
                required
                id="ui-email"
                error="Must be a valid @campus.edu address"
              >
                <Input
                  id="ui-email"
                  type="email"
                  placeholder="student@campus.edu"
                  icon={Mail}
                  defaultValue="invalid-email"
                  error
                />
              </FormField>

              <FormField label="Department / Category" id="ui-cat">
                <Select
                  id="ui-cat"
                  placeholder="Select a category..."
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: 'hostel', label: 'Hostel Maintenance' },
                    { value: 'academic', label: 'Academic & Courses' },
                    { value: 'it', label: 'IT Services & Wi-Fi' },
                  ]}
                />
              </FormField>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-base">Textarea & Toggles</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <FormField
                label="Detailed Description"
                required
                id="ui-desc"
                hint="Minimum 20 characters"
              >
                <Textarea
                  id="ui-desc"
                  rows={3}
                  placeholder="Describe your grievance clearly..."
                />
              </FormField>

              <div className="pt-2 border-t border-slate-100">
                <Toggle
                  label="File Anonymously"
                  description="Your name and identity will not be visible to handling officers"
                  checked={toggleState}
                  onChange={setToggleState}
                />
              </div>
            </Card.Content>
          </Card>
        </div>
      </section>

      {/* 4. Feedback & Ratings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          4. Star Ratings & Feedback
        </h2>
        <Card>
          <Card.Content className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Interactive Rating Input</p>
              <p className="text-xs text-slate-500 mb-2">Hover and click to select rating (1–5)</p>
              <StarRating
                value={starValue}
                onChange={(val) => {
                  setStarValue(val);
                  toast.success(`Rated ${val} stars!`);
                }}
                size="lg"
                showLabel
              />
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
              <p className="text-sm font-medium text-slate-900">Read-Only Display (3.8 avg)</p>
              <p className="text-xs text-slate-500 mb-2">Used in complaint cards & analytics</p>
              <StarRating value={3.8} size="md" showLabel />
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* 5. Navigation, Tabs & Pagination */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          5. Tabs & Pagination
        </h2>
        <Card>
          <Card.Content className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Underline Tabs
              </p>
              <Tabs
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'tab-1', label: 'All Complaints', count: 42 },
                  { id: 'tab-2', label: 'In Progress', count: 7 },
                  { id: 'tab-3', label: 'Resolved', count: 10 },
                ]}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pill Tabs
              </p>
              <Tabs
                variant="pills"
                activeTab={activePillTab}
                onChange={setActivePillTab}
                tabs={[
                  { id: 'all', label: 'All Items' },
                  { id: 'assigned', label: 'Assigned to Me', count: 5 },
                  { id: 'unassigned', label: 'Unassigned Pool', count: 3 },
                ]}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pagination Control
              </p>
              <Pagination
                page={page}
                totalPages={8}
                totalItems={78}
                limit={10}
                onPageChange={setPage}
              />
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* 6. Modals & Dialogs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          6. Modals & Confirm Dialogs
        </h2>
        <Card>
          <Card.Content className="flex flex-wrap items-center gap-4">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Open Standard Modal
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open Confirm Dialog
            </Button>
          </Card.Content>
        </Card>

        {/* Standard Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Complaint Workflow Details"
          description="View and verify the history of status transitions."
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setModalOpen(false);
                  toast.success('Changes saved!');
                }}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              This modal supports closing on <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-xs">Esc</kbd>, clicking outside the container, and automatically captures focus when opened.
            </p>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="font-medium text-slate-800">Status Trail Log</p>
              <p className="text-xs text-slate-500 mt-1">Submitted → Acknowledged → In Progress</p>
            </div>
          </div>
        </Modal>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmAction}
          loading={confirmLoading}
          title="Deactivate Category?"
          message="Are you sure you want to soft-delete this category? Active complaints will still maintain their category reference."
          confirmText="Yes, Deactivate"
          variant="danger"
        />
      </section>

      {/* 7. Loading, Skeletons & Empty States */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
          7. Spinners, Skeletons & Empty States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <Card.Header>
              <Card.Title className="text-base">Spinners & Skeletons</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Spinners
                </p>
                <div className="flex items-center gap-4">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="xl" className="text-emerald-600" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Skeleton Placeholders
                </p>
                <div className="space-y-2">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="85%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-base">Empty State</Card.Title>
            </Card.Header>
            <Card.Content>
              <EmptyState
                icon={Inbox}
                title="No grievances in queue"
                description="All submitted grievances have been handled or reassigned."
                action={
                  <Button variant="outline" size="sm" icon={FolderPlus}>
                    Browse Categories
                  </Button>
                }
              />
            </Card.Content>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default UiKitPage;
