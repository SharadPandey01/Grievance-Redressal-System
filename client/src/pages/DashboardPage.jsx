import { Link } from 'react-router-dom';
import { PlusCircle, FileText, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { Card, Button, PageHeader, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name || 'Complainant'}`}
        description="View your active grievances, track resolution progress, or file a new campus complaint."
        badge={<Badge variant="indigo" dot>{role === 'staff' ? 'Staff Portal' : 'Student Portal'}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Link to="/complaints/new">
              <Button variant="primary" icon={PlusCircle}>
                File New Complaint
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50/60 to-white border-indigo-100">
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                My Complaints
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">Track Issues</h3>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/60 to-white border-amber-100">
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                In Progress
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">Active Triage</h3>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/60 to-white border-emerald-100">
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                Resolved
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">Verification Ready</h3>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center justify-between">
              <span>Recent Grievance Submissions</span>
              <Badge variant="neutral">Phase F3 / F4</Badge>
            </Card.Title>
            <Card.Description>
              Your filed complaints will appear here with live status indicators and real-time timeline logs.
            </Card.Description>
          </Card.Header>
          <Card.Content className="py-8 text-center text-slate-500 space-y-3">
            <p className="text-sm">
              Live complaints list and detailed tracking view will be connected in Phase F3.
            </p>
            <div>
              <Link to="/complaints/new">
                <Button variant="outline" size="sm" icon={PlusCircle}>
                  Submit a Complaint Now
                </Button>
              </Link>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Quick Links
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3">
            <Link
              to="/profile"
              className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <h4 className="text-sm font-semibold text-slate-900">My Profile & Security</h4>
              <p className="text-xs text-slate-500 mt-0.5">Update personal info or password</p>
            </Link>

            <Link
              to="/ui-kit"
              className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <h4 className="text-sm font-semibold text-slate-900">UI Component Kit</h4>
              <p className="text-xs text-slate-500 mt-0.5">Explore design tokens and components</p>
            </Link>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
