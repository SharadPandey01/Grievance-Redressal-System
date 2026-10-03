import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert, KeyRound, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { validateLogin } from '../lib/validators';
import { Button, Input, FormField, Card, Badge } from '../components/ui';

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student1@campus.edu', role: 'student', badge: 'indigo' },
  { label: 'Officer (Hostel)', email: 'officer.hostel@campus.edu', role: 'officer', badge: 'amber' },
  { label: 'Administrator', email: 'admin@campus.edu', role: 'admin', badge: 'rose' },
  { label: 'Staff Member', email: 'staff1@campus.edu', role: 'staff', badge: 'sky' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setErrors({});
    setServerError('');
  };

  const getRedirectPath = (userRole) => {
    // Check if user was trying to access a specific page before login
    const fromPath = location.state?.from?.pathname;
    if (fromPath && fromPath !== '/login' && fromPath !== '/register' && fromPath !== '/403') {
      return fromPath;
    }

    // Default landing paths per role
    switch (userRole) {
      case 'student':
      case 'staff':
        return '/dashboard';
      case 'officer':
        return '/officer';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const validation = validateLogin({ email, password });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const data = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      const userRole = data.user.role;
      toast.success(`Welcome back, ${data.user.name}!`);
      const targetPath = getRedirectPath(userRole);
      navigate(targetPath, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setServerError('Invalid email or password. Please verify your credentials.');
      } else if (err.status === 403) {
        setServerError('Your account has been deactivated. Please contact campus administration.');
      } else if (err.status === 400 && Array.isArray(err.errors) && err.errors.length > 0) {
        const fieldErrors = {};
        err.errors.forEach((item) => {
          if (item.field) fieldErrors[item.field] = item.message;
        });
        setErrors(fieldErrors);
      } else {
        setServerError(err.message || 'Unable to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Campus Grievance Portal
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          Sign in to file, track, or manage campus complaints
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
                label="Campus Email"
                required
                id="login-email"
                error={errors.email}
              >
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@campus.edu"
                  icon={Mail}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  error={Boolean(errors.email)}
                  autoComplete="email"
                  autoFocus
                />
              </FormField>

              <FormField
                label="Password"
                required
                id="login-password"
                error={errors.password}
              >
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  error={Boolean(errors.password)}
                  autoComplete="current-password"
                />
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={loading}
                  icon={LogIn}
                >
                  Sign In
                </Button>
              </div>
            </form>

            {/* Quick Demo Accounts */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                Quick Demo Accounts (Password: Password@123)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleFillDemo(demo.email)}
                    className="flex flex-col items-start p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium text-slate-800 group-hover:text-indigo-900">
                        {demo.label}
                      </span>
                      <Badge variant={demo.badge} size="sm">
                        {demo.role}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate w-full mt-0.5">
                      {demo.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card.Content>

          <Card.Footer className="justify-center text-xs text-slate-600 py-3.5 bg-slate-50/60">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="ml-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Register here
            </Link>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
