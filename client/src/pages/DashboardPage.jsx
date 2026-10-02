import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, LayoutDashboard } from 'lucide-react';
import { Card, Button, PageHeader, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to the Campus Grievance and Complaint Redressal Portal."
        badge={<Badge variant="emerald" dot>System Online</Badge>}
        action={
          <Link to="/ui-kit">
            <Button variant="outline" icon={Sparkles}>
              Inspect UI Kit
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-indigo-600" />
              Overview
            </Card.Title>
            <Card.Description>
              F1 foundation has established the core theme, typography, API client, hooks, and reusable component system.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 text-sm text-slate-600">
            <p>
              Signed in as: <span className="font-semibold text-slate-800">{user?.name || 'Guest User'}</span>
              {role && (
                <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {role}
                </span>
              )}
            </p>
            <p>
              To visually inspect and test all 18 UI components, visit the{' '}
              <Link to="/ui-kit" className="font-medium text-indigo-600 hover:text-indigo-700 underline">
                UI Kit showcase page
              </Link>.
            </p>
          </Card.Content>
          <Card.Footer>
            <Link to="/ui-kit">
              <Button size="sm">Open UI Kit</Button>
            </Link>
          </Card.Footer>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              F1 Deliverables
            </Card.Title>
          </Card.Header>
          <Card.Content className="text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Tailwind v4 Theme</span>
              <Badge variant="emerald" size="sm">Ready</Badge>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Axios API Client</span>
              <Badge variant="emerald" size="sm">Ready</Badge>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>useFetch Hook</span>
              <Badge variant="emerald" size="sm">Ready</Badge>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>18 Hand-written Components</span>
              <Badge variant="emerald" size="sm">Ready</Badge>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Responsive AppLayout</span>
              <Badge variant="emerald" size="sm">Ready</Badge>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
