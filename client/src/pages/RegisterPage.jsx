import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Building2,
  UserPlus,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { validateRegister } from '../lib/validators';
import { Button, Input, Select, FormField, Card } from '../components/ui';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      role,
      department: department.trim() || undefined,
    };

    const validation = validateRegister(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      await register({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        department: payload.department,
      });

      toast.success('Account created successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setServerError('An account with this email address already exists. Please log in.');
        setErrors((prev) => ({ ...prev, email: 'Email is already in use' }));
      } else if (err.status === 400 && Array.isArray(err.errors) && err.errors.length > 0) {
        const fieldErrors = {};
        err.errors.forEach((item) => {
          if (item.field) fieldErrors[item.field] = item.message;
        });
        setErrors(fieldErrors);
      } else {
        setServerError(err.message || 'Registration failed. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Create an Account
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          Register as a student or staff member to file campus grievances
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="shadow-lg border-slate-200/80">
          <Card.Content className="p-6 sm:p-8 space-y-6">
            {serverError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-sm text-rose-800 animate-fadeIn">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{serverError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormField
                label="Full Name"
                required
                id="reg-name"
                error={errors.name}
              >
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Priyanshu Roy"
                  icon={User}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                  }}
                  error={Boolean(errors.name)}
                  autoFocus
                />
              </FormField>

              <FormField
                label="Campus Email Address"
                required
                id="reg-email"
                error={errors.email}
              >
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="name@campus.edu"
                  icon={Mail}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  error={Boolean(errors.email)}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Role"
                  required
                  id="reg-role"
                  error={errors.role}
                >
                  <Select
                    id="reg-role"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (errors.role) setErrors((prev) => ({ ...prev, role: null }));
                    }}
                    options={[
                      { value: 'student', label: 'Student' },
                      { value: 'staff', label: 'Staff Member' },
                    ]}
                  />
                </FormField>

                <FormField
                  label="Department / Course"
                  id="reg-department"
                  hint="Optional"
                  error={errors.department}
                >
                  <Input
                    id="reg-department"
                    type="text"
                    placeholder="e.g. Computer Science"
                    icon={Building2}
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (errors.department) setErrors((prev) => ({ ...prev, department: null }));
                    }}
                    error={Boolean(errors.department)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Password"
                  required
                  id="reg-password"
                  hint="Min 8 chars, 1 letter, 1 number"
                  error={errors.password}
                >
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    error={Boolean(errors.password)}
                  />
                </FormField>

                <FormField
                  label="Confirm Password"
                  required
                  id="reg-confirmPassword"
                  error={errors.confirmPassword}
                >
                  <Input
                    id="reg-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                    error={Boolean(errors.confirmPassword)}
                  />
                </FormField>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Officers and Administrators are provisioned directly by campus administration.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={loading}
                  icon={UserPlus}
                >
                  Create Account
                </Button>
              </div>
            </form>
          </Card.Content>

          <Card.Footer className="justify-center text-xs text-slate-600 py-3.5 bg-slate-50/60">
            Already have an account?{' '}
            <Link
              to="/login"
              className="ml-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Sign in
            </Link>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
