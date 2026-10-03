import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function ForbiddenPage() {
  const { user, role } = useAuth();

  const getDashboardPath = () => {
    switch (role) {
      case 'student':
      case 'staff':
        return '/dashboard';
      case 'officer':
        return '/officer';
      case 'admin':
        return '/admin';
      default:
        return '/login';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center shadow-lg border-rose-100">
        <Card.Content className="p-8 space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldX className="h-10 w-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-600">
              403 Error
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Access Restricted
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              You do not have the required permissions to view this resource.
            </p>
          </div>

          {user && (
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current User:</span>
                <span className="font-medium text-slate-800">{user.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Your Role:</span>
                <Badge variant="indigo" size="sm">
                  {role || 'Unknown'}
                </Badge>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={getDashboardPath()} className="w-full sm:w-auto">
              <Button variant="primary" icon={Home} fullWidth>
                Back to My Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export default ForbiddenPage;
