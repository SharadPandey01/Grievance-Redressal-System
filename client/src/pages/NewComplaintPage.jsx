import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload,
  X,
  Check,
  Copy,
  Clock,
  Shield,
  PlusCircle,
  File,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Toggle,
  FormField,
  PageHeader,
  Spinner,
} from '../components/ui';
import { getCategories } from '../api/categories';
import { createComplaint } from '../api/complaints';
import { validateCreateComplaint, validateAttachments, ATTACHMENT_RULES } from '../lib/validators';
import { formatFileSize } from '../lib/format';
import { SLA_DAYS } from '../lib/constants';
import { classNames } from '../lib/classNames';

export function NewComplaintPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Categories list
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState([]);

  // UI state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Success state
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load categories
  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((data) => {
        if (mounted) {
          setCategories(data || []);
          setLoadingCategories(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          toast.error(err.message || 'Failed to load complaint categories');
          setLoadingCategories(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // File selection handlers
  const handleFilesAdded = (incomingFiles) => {
    const fileList = Array.from(incomingFiles);
    const { validFiles, errors: fileErrors } = validateAttachments(fileList, files.length);

    if (fileErrors.length > 0) {
      fileErrors.forEach((err) => toast.error(err));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles].slice(0, ATTACHMENT_RULES.MAX_FILES));
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const { isValid, errors: validationErrors } = validateCreateComplaint({
      title,
      description,
      category,
      priority,
    });

    if (!isValid) {
      setErrors(validationErrors);
      // Scroll to top error or show toast
      const firstError = Object.values(validationErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('isAnonymous', isAnonymous ? 'true' : 'false');

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await createComplaint(formData);
      setSubmittedComplaint(response);
      toast.success('Complaint filed successfully!');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const mappedErrors = {};
        err.errors.forEach((e) => {
          if (e.field) mappedErrors[e.field] = e.message;
        });
        setErrors(mappedErrors);
      }
      toast.error(err.message || 'Failed to submit complaint. Please check the form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!submittedComplaint?.code) return;
    navigator.clipboard.writeText(submittedComplaint.code);
    setCopied(true);
    toast.success('Complaint code copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForm = () => {
    setTitle('');
    setCategory('');
    setPriority('Medium');
    setDescription('');
    setIsAnonymous(false);
    setFiles([]);
    setErrors({});
    setSubmittedComplaint(null);
    setCopied(false);
  };

  // ─── Render Success Confirmation ──────────────────────────────────────────
  if (submittedComplaint) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <Card className="border-emerald-200 bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-inner mb-3">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Grievance Registered Successfully</h2>
            <p className="text-emerald-50 text-sm mt-1 max-w-md mx-auto">
              Your complaint has been logged and queued for administrative review and officer assignment.
            </p>
          </div>

          <Card.Content className="p-6 sm:p-8 space-y-6">
            {/* Tracking Code Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Official Tracking Code
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-wider">
                  {submittedComplaint.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  title="Copy complaint code"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Complaint Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Title</span>
                <p className="font-semibold text-slate-800 line-clamp-2">{submittedComplaint.title}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Priority & SLA Resolution</span>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>{submittedComplaint.priority} Priority</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({SLA_DAYS[submittedComplaint.priority] || 5} days target)
                  </span>
                </p>
              </div>
            </div>

            {submittedComplaint.isAnonymous && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                <Shield className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Anonymous Complaint:</strong> Your identity is hidden from grievance officers and will appear as "Anonymous".
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => navigate(`/complaints/${submittedComplaint._id}`)}
              >
                View Complaint Details
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                icon={PlusCircle}
                onClick={handleResetForm}
              >
                File Another Complaint
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // ─── Render New Complaint Form ────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="File a New Grievance"
        description="Provide clear details about your issue. It will be assigned to the designated department officer for prompt resolution."
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <Card.Content className="p-6 sm:p-8 space-y-6">
            {/* Title */}
            <FormField
              id="title"
              label="Complaint Subject / Title"
              required
              hint="5 to 120 characters"
              error={errors.title}
            >
              <Input
                id="title"
                type="text"
                placeholder="e.g. Water leakage in hostel room 204"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                error={!!errors.title}
                required
              />
              <div className="flex justify-end mt-1 text-[11px] text-slate-400">
                {title.length}/120
              </div>
            </FormField>

            {/* Category */}
            <FormField
              id="category"
              label="Department Category"
              required
              hint="Select the responsible area"
              error={errors.category}
            >
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                error={!!errors.category}
                disabled={loadingCategories}
                placeholder={loadingCategories ? 'Loading categories...' : 'Select a category'}
                options={categories.map((c) => ({
                  value: c._id,
                  label: `${c.name} (${c.department})`,
                }))}
              />
            </FormField>

            {/* Priority Segmented Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Priority Level <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  Determines SLA response timeline
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'Low',
                    label: 'Low Priority',
                    sla: '7 Days SLA',
                    desc: 'Minor non-urgent inconveniences',
                    borderActive: 'border-slate-800 bg-slate-50/70 ring-1 ring-slate-800',
                  },
                  {
                    value: 'Medium',
                    label: 'Medium Priority',
                    sla: '5 Days SLA',
                    desc: 'Standard campus maintenance (Default)',
                    borderActive: 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600',
                  },
                  {
                    value: 'High',
                    label: 'High Priority',
                    sla: '2 Days SLA',
                    desc: 'Critical or safety-related emergencies',
                    borderActive: 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-600',
                  },
                ].map((item) => {
                  const isSelected = priority === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPriority(item.value)}
                      className={classNames(
                        'flex flex-col text-left p-3.5 rounded-xl border transition-all duration-150 relative cursor-pointer',
                        isSelected
                          ? item.borderActive
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{item.label}</span>
                        <span
                          className={classNames(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                            item.value === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : item.value === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {item.sla}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <FormField
              id="description"
              label="Detailed Grievance Description"
              required
              hint="20 to 2,000 characters"
              error={errors.description}
            >
              <Textarea
                id="description"
                rows={5}
                placeholder="Provide specific information such as room number, building, equipment affected, and how long the issue has persisted..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                error={!!errors.description}
                required
              />
              <div className="flex justify-between items-center mt-1 text-[11px]">
                <span className={description.length < 20 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                  {description.length < 20 ? `Minimum 20 characters required (${20 - description.length} more)` : 'Length is valid'}
                </span>
                <span className="text-slate-400">{description.length}/2000</span>
              </div>
            </FormField>

            {/* Anonymous Toggle */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <Toggle
                id="isAnonymous"
                checked={isAnonymous}
                onChange={setIsAnonymous}
                label="Submit Anonymously"
                description="Your name and email will be concealed. Officers and administrators will only see 'Anonymous'."
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Supporting Attachments (Optional)
                </label>
                <span className="text-xs text-slate-500">
                  Max 3 files (5 MB each, JPG, PNG, PDF)
                </span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={classNames(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 bg-slate-50/30 hover:border-slate-400 hover:bg-slate-50/70',
                  files.length >= ATTACHMENT_RULES.MAX_FILES ? 'opacity-50 pointer-events-none' : ''
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-800">
                  <span className="text-indigo-600 hover:underline">Click to browse</span> or drag and drop files here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPG, PNG or PDF up to 5 MB each ({files.length}/{ATTACHMENT_RULES.MAX_FILES} attached)
                </p>
              </div>

              {/* Uploaded File List */}
              {files.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  {files.map((file, index) => {
                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    return (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-3 text-sm hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            {isPdf ? (
                              <File className="h-5 w-5 text-rose-600" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card.Content>

          <Card.Footer className="justify-between flex-wrap gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              icon={submitting ? Spinner : Sparkles}
            >
              {submitting ? 'Submitting Grievance...' : 'Submit Complaint'}
            </Button>
          </Card.Footer>
        </form>
      </Card>
    </div>
  );
}

export default NewComplaintPage;
