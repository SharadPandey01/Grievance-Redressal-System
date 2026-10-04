import { useState, useEffect, useCallback } from 'react';
import {
  FolderPlus,
  RotateCw,
  Search,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  PageHeader,
  Badge,
  Input,
  Textarea,
  Select,
  FormField,
  Modal,
  ConfirmDialog,
  Toggle,
  Skeleton,
  EmptyState,
} from '../components/ui';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/categories';
import { getOfficers } from '../api/users';
import { useFetch } from '../hooks/useFetch';

export function AdminCategoriesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [officers, setOfficers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [defaultHandler, setDefaultHandler] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchCategoryList = useCallback(() => {
    return getCategories({ all: 'true' });
  }, []);

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useFetch(fetchCategoryList, [], { pollMs: 30000 });

  useEffect(() => {
    let mounted = true;
    getOfficers({})
      .then((data) => {
        if (mounted) setOfficers(data || []);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setDepartment('');
    setDefaultHandler('');
    setIsActive(true);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setDepartment(cat.department || '');
    setDefaultHandler(cat.defaultHandler?._id || cat.defaultHandler || '');
    setIsActive(cat.isActive !== false);
    setFieldErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Category name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    }

    if (!department.trim()) {
      errors.department = 'Department is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setFieldErrors({});

    const payload = {
      name: name.trim(),
      description: description.trim(),
      department: department.trim(),
      defaultHandler: defaultHandler || null,
      isActive,
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, payload);
        toast.success(`Category "${name.trim()}" updated`);
      } else {
        await createCategory(payload);
        toast.success(`Category "${name.trim()}" created`);
      }
      setModalOpen(false);
      refetchCategories();
    } catch (err) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('already exists')) {
        setFieldErrors((prev) => ({
          ...prev,
          name: 'A category with this name already exists',
        }));
      } else if (err?.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((e) => {
          if (e.field) mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      } else {
        toast.error(err?.message || 'Failed to save category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deleteCategory(deactivateTarget._id);
      toast.success(`Category "${deactivateTarget.name}" deactivated`);
      setDeactivateTarget(null);
      refetchCategories();
    } catch (err) {
      toast.error(err?.message || 'Failed to deactivate category');
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async (cat) => {
    try {
      await updateCategory(cat._id, { isActive: true });
      toast.success(`Category "${cat.name}" reactivated`);
      refetchCategories();
    } catch (err) {
      toast.error(err?.message || 'Failed to reactivate category');
    }
  };

  const filteredCategories = (categories || []).filter((cat) => {
    const matchesSearch =
      searchInput.trim() === '' ||
      cat.name?.toLowerCase().includes(searchInput.toLowerCase()) ||
      cat.department?.toLowerCase().includes(searchInput.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchInput.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && cat.isActive) ||
      (statusFilter === 'Inactive' && !cat.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Category Master Data"
        subtitle="Manage complaint categories, department mappings, and default automated officer handlers."
        breadcrumbs={[{ label: 'Home', href: '/admin' }, { label: 'Categories' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCw}
              onClick={refetchCategories}
              title="Refresh categories"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FolderPlus}
              onClick={openCreateModal}
            >
              New Category
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search category or department…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-36">
              <Select
                id="filter-active-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {categoriesError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">
              {categoriesError?.message || 'Failed to load categories.'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={refetchCategories}>
            Retry
          </Button>
        </div>
      )}

      {categoriesLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 animate-pulse">
              <div className="space-y-2 w-1/3">
                <Skeleton width="80%" height="18px" />
                <Skeleton width="50%" height="12px" />
              </div>
              <Skeleton width="120px" height="16px" />
              <Skeleton width="80px" height="24px" className="rounded-full" />
              <Skeleton width="90px" height="32px" />
            </div>
          ))}
        </div>
      )}

      {!categoriesLoading && filteredCategories.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <EmptyState
            icon={Building}
            title={searchInput ? 'No matching categories' : 'No categories found'}
            description={
              searchInput
                ? 'Try adjusting your search criteria.'
                : 'Click "New Category" to register your campus departments and issue types.'
            }
            action={
              searchInput ? (
                <Button variant="outline" size="sm" onClick={() => setSearchInput('')}>
                  Clear search
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={FolderPlus} onClick={openCreateModal}>
                  Create First Category
                </Button>
              )
            }
          />
        </div>
      )}

      {!categoriesLoading && filteredCategories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Category Name</th>
                  <th scope="col" className="px-5 py-3.5">Department</th>
                  <th scope="col" className="px-5 py-3.5">Default Officer</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((cat) => {
                  const defaultOfficer =
                    cat.defaultHandler?.name ||
                    officers.find((o) => o._id === cat.defaultHandler)?.name;

                  return (
                    <tr
                      key={cat._id}
                      className={cat.isActive ? 'hover:bg-slate-50/80 transition-colors' : 'bg-slate-50/50 text-slate-400'}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{cat.name}</div>
                        {cat.description && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {cat.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {cat.department}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {defaultOfficer ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <User className="h-3 w-3 text-indigo-500" />
                            {defaultOfficer}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None (Pool)</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {cat.isActive ? (
                          <Badge variant="success" size="sm" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Edit2}
                            onClick={() => openEditModal(cat)}
                          >
                            Edit
                          </Button>

                          {cat.isActive ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={Trash2}
                              onClick={() => setDeactivateTarget(cat)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Soft deactivate category"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={CheckCircle2}
                              onClick={() => handleReactivate(cat)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Reactivate category"
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={submitting ? undefined : () => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description="Categories organize grievances and route incoming tickets to default officers."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleSubmitModal}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitModal} className="space-y-4">
          <FormField
            label="Category Name"
            required
            id="cat-name"
            error={fieldErrors.name}
          >
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g. Hostel & Mess"
              error={!!fieldErrors.name}
            />
          </FormField>

          <FormField
            label="Department"
            required
            id="cat-dept"
            error={fieldErrors.department}
          >
            <Input
              id="cat-dept"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                if (fieldErrors.department) setFieldErrors((prev) => ({ ...prev, department: null }));
              }}
              placeholder="e.g. Hostel Administration"
              error={!!fieldErrors.department}
            />
          </FormField>

          <FormField
            label="Description"
            hint="Optional"
            id="cat-desc"
          >
            <Textarea
              id="cat-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief guidance on what belongs in this category…"
              maxLength={300}
            />
          </FormField>

          <FormField
            label="Default Officer (Auto-assignment)"
            hint="Optional"
            id="cat-handler"
          >
            <Select
              id="cat-handler"
              value={defaultHandler}
              onChange={(e) => setDefaultHandler(e.target.value)}
            >
              <option value="">None (Tickets stay in department unassigned pool)</option>
              {officers.map((off) => (
                <option key={off._id} value={off._id}>
                  {off.name} — {off.department} ({off.email})
                </option>
              ))}
            </Select>
          </FormField>

          {editingCategory && (
            <div className="pt-2 border-t border-slate-100">
              <Toggle
                id="toggle-cat-active"
                checked={isActive}
                onChange={setIsActive}
                label="Active Status"
                description="Inactive categories cannot be chosen when filing new grievances."
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={deactivating}
        variant="danger"
        title={`Deactivate "${deactivateTarget?.name}"?`}
        message="Existing complaints under this category will preserve their category reference, but complainants will no longer be able to select it when filing new grievances."
        confirmText="Deactivate Category"
      />
    </div>
  );
}

export default AdminCategoriesPage;
