import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  RotateCw,
  Search,
  X,
  Edit2,
  Users,
  Shield,
  KeyRound,
  AlertTriangle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  PageHeader,
  Badge,
  Input,
  Select,
  FormField,
  Modal,
  Toggle,
  Pagination,
  Skeleton,
  EmptyState,
} from '../components/ui';
import { getUsers, createUser, updateUser } from '../api/users';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { ROLES, ROLE_LABELS } from '../lib/constants';

function generateRandomPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const specials = '@#$%!';
  let pass = '';
  for (let i = 0; i < 6; i++) pass += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 3; i++) pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += specials.charAt(Math.floor(Math.random() * specials.length));
  return pass;
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role') || 'All';
  const departmentParam = searchParams.get('department') || '';
  const activeParam = searchParams.get('active') || 'All';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limit = 10;

  const [searchInput, setSearchInput] = useState(searchParam);
  const [departmentInput, setDepartmentInput] = useState(departmentParam);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('student');
  const [createDepartment, setCreateDepartment] = useState('');
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('student');
  const [editDepartment, setEditDepartment] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);

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
              (key === 'page' && value === 1)
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

  const fetchUserList = useCallback(() => {
    const params = {
      page: pageParam,
      limit,
    };
    if (roleParam !== 'All') params.role = roleParam;
    if (departmentParam.trim()) params.department = departmentParam.trim();
    if (activeParam === 'Active') params.isActive = 'true';
    if (activeParam === 'Inactive') params.isActive = 'false';
    if (searchParam.trim()) params.search = searchParam.trim();

    return getUsers(params);
  }, [pageParam, limit, roleParam, departmentParam, activeParam, searchParam]);

  const {
    data: users,
    meta,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useFetch(
    fetchUserList,
    [pageParam, roleParam, departmentParam, activeParam, searchParam],
    { pollMs: 30000 }
  );

  const openCreateModal = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword(generateRandomPassword());
    setCreateRole('student');
    setCreateDepartment('');
    setCreateErrors({});
    setCreateModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'student');
    setEditDepartment(u.department || '');
    setEditIsActive(u.isActive !== false);
    setEditErrors({});
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!createName.trim()) errors.name = 'Full name is required';
    if (!createEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      errors.email = 'Must be a valid email address';
    }

    if (!createPassword) {
      errors.password = 'Password is required';
    } else if (
      createPassword.length < 8 ||
      !/[A-Za-z]/.test(createPassword) ||
      !/[0-9]/.test(createPassword)
    ) {
      errors.password = 'Password must be ≥8 chars with at least 1 letter and 1 number';
    }

    if (createRole === 'officer' && !createDepartment.trim()) {
      errors.department = 'Department is required for officers';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreating(true);
    setCreateErrors({});

    try {
      await createUser({
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        role: createRole,
        department: createRole === 'officer' ? createDepartment.trim() : undefined,
      });

      toast.success(`User "${createName.trim()}" created successfully`);
      setCreateModalOpen(false);
      refetchUsers();
    } catch (err) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('already exists')) {
        setCreateErrors((prev) => ({ ...prev, email: 'A user with this email already exists' }));
      } else if (err?.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((e) => {
          if (e.field) mapped[e.field] = e.message;
        });
        setCreateErrors(mapped);
      } else {
        toast.error(err?.message || 'Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const errors = {};
    if (!editName.trim()) errors.name = 'Name cannot be empty';
    if (editRole === 'officer' && !editDepartment.trim()) {
      errors.department = 'Department is required for officers';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setUpdating(true);
    setEditErrors({});

    const payload = {
      name: editName.trim(),
      role: editRole,
      department: editRole === 'officer' ? editDepartment.trim() : '',
      isActive: editIsActive,
    };

    try {
      await updateUser(editingUser._id, payload);
      toast.success(`User "${editName.trim()}" updated`);
      setEditModalOpen(false);
      refetchUsers();
    } catch (err) {
      if (err?.status === 409) {
        toast.error(err.message || 'Cannot perform this action due to safety guards');
      } else if (err?.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((e) => {
          if (e.field) mapped[e.field] = e.message;
        });
        setEditErrors(mapped);
      } else {
        toast.error(err?.message || 'Failed to update user');
      }
    } finally {
      setUpdating(false);
    }
  };

  const isSelfEditing = editingUser && editingUser._id === currentUser?._id;

  const hasActiveFilters =
    roleParam !== 'All' ||
    departmentParam.trim() !== '' ||
    activeParam !== 'All' ||
    searchParam.trim() !== '';

  const clearAllFilters = () => {
    setSearchInput('');
    setDepartmentInput('');
    updateFilters({
      role: null,
      department: null,
      active: null,
      search: null,
      page: 1,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="User Account Management"
        subtitle="Manage campus accounts, assign officer departments, provision administrative roles, and inspect status."
        breadcrumbs={[{ label: 'Home', href: '/admin' }, { label: 'Users' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCw}
              onClick={refetchUsers}
              title="Refresh users list"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={openCreateModal}
            >
              Add User
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
              placeholder="Search by name or email…"
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
                id="filter-role"
                value={roleParam}
                onChange={(e) => updateFilters({ role: e.target.value, page: 1 })}
              >
                <option value="All">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Input
                id="filter-department"
                placeholder="Filter department…"
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFilters({ department: departmentInput.trim() || null, page: 1 });
                  }
                }}
                onBlur={() => {
                  if (departmentInput.trim() !== departmentParam) {
                    updateFilters({ department: departmentInput.trim() || null, page: 1 });
                  }
                }}
              />
            </div>

            <div className="w-36">
              <Select
                id="filter-user-status"
                value={activeParam}
                onChange={(e) => updateFilters({ active: e.target.value, page: 1 })}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </Select>
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

      {usersError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">
              {usersError?.message || 'Failed to load user directory.'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={refetchUsers}>
            Retry
          </Button>
        </div>
      )}

      {usersLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 animate-pulse">
              <div className="space-y-2 w-1/3">
                <Skeleton width="75%" height="18px" />
                <Skeleton width="50%" height="12px" />
              </div>
              <Skeleton width="100px" height="20px" />
              <Skeleton width="120px" height="16px" />
              <Skeleton width="70px" height="22px" className="rounded-full" />
              <Skeleton width="40px" height="32px" />
            </div>
          ))}
        </div>
      )}

      {!usersLoading && users && users.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? 'No users matching criteria' : 'No users registered'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search keywords or clearing active filters.'
                : 'Get started by creating student, staff, or department officer accounts.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={UserPlus} onClick={openCreateModal}>
                  Create First User
                </Button>
              )
            }
          />
        </div>
      )}

      {!usersLoading && users && users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">User</th>
                  <th scope="col" className="px-5 py-3.5">Role</th>
                  <th scope="col" className="px-5 py-3.5">Department</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5">Registered</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u._id === currentUser?._id;
                  return (
                    <tr
                      key={u._id}
                      className={u.isActive ? 'hover:bg-slate-50/80 transition-colors' : 'bg-slate-50/60 text-slate-400'}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          {isCurrent && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{u.email}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium capitalize text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                          {u.role === 'admin' ? (
                            <Shield className="h-3 w-3 text-indigo-600" />
                          ) : (
                            <Users className="h-3 w-3 text-slate-400" />
                          )}
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                        {u.department ? (
                          <span className="font-medium text-slate-800">{u.department}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {u.isActive ? (
                          <Badge variant="success" size="sm" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <Button
                          size="xs"
                          variant="outline"
                          icon={Edit2}
                          onClick={() => openEditModal(u)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100">
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

      <Modal
        isOpen={createModalOpen}
        onClose={creating ? undefined : () => setCreateModalOpen(false)}
        title="Provision New Campus User"
        description="Create student, staff, grievance officer, or administrator accounts."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreateSubmit}
            >
              Create Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormField
            label="Full Name"
            required
            id="create-name"
            error={createErrors.name}
          >
            <Input
              id="create-name"
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
                if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g. Dr. Jane Smith"
              error={!!createErrors.name}
            />
          </FormField>

          <FormField
            label="Email Address"
            required
            id="create-email"
            error={createErrors.email}
          >
            <Input
              id="create-email"
              type="email"
              value={createEmail}
              onChange={(e) => {
                setCreateEmail(e.target.value);
                if (createErrors.email) setCreateErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="e.g. j.smith@campus.edu"
              error={!!createErrors.email}
            />
          </FormField>

          <FormField
            label="Temporary Password"
            required
            id="create-pass"
            error={createErrors.password}
            hint="Min 8 chars, 1 letter, 1 number"
          >
            <div className="flex gap-2">
              <Input
                id="create-pass"
                type="text"
                value={createPassword}
                onChange={(e) => {
                  setCreatePassword(e.target.value);
                  if (createErrors.password) setCreateErrors((prev) => ({ ...prev, password: null }));
                }}
                className="font-mono text-sm"
                error={!!createErrors.password}
              />
              <Button
                type="button"
                variant="outline"
                size="md"
                icon={KeyRound}
                onClick={() => setCreatePassword(generateRandomPassword())}
                title="Generate secure password"
              >
                Generate
              </Button>
            </div>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role" required id="create-role">
              <Select
                id="create-role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="officer">Grievance Officer</option>
                <option value="admin">Administrator</option>
              </Select>
            </FormField>

            <FormField
              label="Department"
              required={createRole === 'officer'}
              hint={createRole !== 'officer' ? 'Optional' : undefined}
              id="create-dept"
              error={createErrors.department}
            >
              <Input
                id="create-dept"
                value={createDepartment}
                onChange={(e) => {
                  setCreateDepartment(e.target.value);
                  if (createErrors.department) setCreateErrors((prev) => ({ ...prev, department: null }));
                }}
                placeholder={createRole === 'officer' ? 'e.g. Hostel Administration' : 'e.g. Computer Science'}
                error={!!createErrors.department}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={updating ? undefined : () => setEditModalOpen(false)}
        title={`Edit User: ${editingUser?.name}`}
        description="Update role permissions, department assignment, and active status."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={updating}
              onClick={handleEditSubmit}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {isSelfEditing && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                You are currently modifying your own account. Self-demotion from admin and self-deactivation are protected and disabled.
              </span>
            </div>
          )}

          <FormField
            label="Full Name"
            required
            id="edit-name"
            error={editErrors.name}
          >
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: null }));
              }}
              error={!!editErrors.name}
            />
          </FormField>

          <FormField label="Email" hint="Immutable" id="edit-email">
            <Input
              id="edit-email"
              value={editingUser?.email || ''}
              disabled
              className="bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role" required id="edit-role">
              <Select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={isSelfEditing}
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="officer">Grievance Officer</option>
                <option value="admin">Administrator</option>
              </Select>
            </FormField>

            <FormField
              label="Department"
              required={editRole === 'officer'}
              id="edit-dept"
              error={editErrors.department}
            >
              <Input
                id="edit-dept"
                value={editDepartment}
                onChange={(e) => {
                  setEditDepartment(e.target.value);
                  if (editErrors.department) setEditErrors((prev) => ({ ...prev, department: null }));
                }}
                placeholder={editRole === 'officer' ? 'Required for officer' : 'Optional'}
                error={!!editErrors.department}
              />
            </FormField>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Toggle
              id="toggle-user-active"
              checked={editIsActive}
              onChange={setEditIsActive}
              disabled={isSelfEditing}
              label="Active Account Status"
              description="Inactive users are rejected upon login and cannot file or handle complaints."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminUsersPage;
