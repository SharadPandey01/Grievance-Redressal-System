import { useState } from 'react';
import { User, Mail, Building2, KeyRound, Shield, Save, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';
import { validateUpdateProfile, validateChangePassword } from '../lib/validators';
import { formatDate } from '../lib/format';
import { ROLE_LABELS } from '../lib/constants';
import {
  PageHeader,
  Card,
  Button,
  Input,
  FormField,
  Badge,
  Tabs,
} from '../components/ui';

export function ProfilePage() {
  const { user, role, updateProfile, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Profile Update Form State
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileErrors({});

    const validation = validateUpdateProfile({ name, department });
    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        department: department.trim() || undefined,
      });
      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (err) {
      if (err.status === 400 && Array.isArray(err.errors)) {
        const errMap = {};
        err.errors.forEach((e) => {
          if (e.field) errMap[e.field] = e.message;
        });
        setProfileErrors(errMap);
      } else {
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    const validation = validateChangePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.status === 400) {
        setPasswordErrors({ currentPassword: err.message });
      } else {
        toast.error(err.message || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="User Profile"
        description="Manage your campus account details, department assignments, and security settings."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Profile' },
        ]}
      />

      {/* Account Info Summary Card */}
      <Card className="bg-gradient-to-r from-slate-50 to-white">
        <Card.Content className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-sm">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                  <Badge variant="indigo" dot size="sm">
                    {ROLE_LABELS[role] || role}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                  {user?.department && (
                    <>
                      <span>•</span>
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{user.department}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {user?.createdAt && (
              <div className="text-xs text-slate-400">
                Member since {formatDate(user.createdAt)}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'details', label: 'Edit Profile', icon: User },
          { id: 'security', label: 'Security & Password', icon: KeyRound },
        ]}
      />

      {/* Tab 1: Edit Profile Details */}
      {activeTab === 'details' && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Personal Information
            </Card.Title>
            <Card.Description>
              Update your display name and academic department or office location.
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
              <FormField
                label="Full Name"
                required
                id="prof-name"
                error={profileErrors.name}
              >
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={User}
                  error={Boolean(profileErrors.name)}
                />
              </FormField>

              <FormField
                label="Email Address"
                id="prof-email"
                hint="Contact administration to change your registered email"
              >
                <Input
                  id="prof-email"
                  value={user?.email || ''}
                  disabled
                  icon={Mail}
                />
              </FormField>

              <FormField
                label="Department / Hostel"
                id="prof-dept"
                hint="Assigned department or hostel wing"
                error={profileErrors.department}
              >
                <Input
                  id="prof-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  icon={Building2}
                  placeholder="e.g. Hostel Warden / IT Helpdesk"
                  error={Boolean(profileErrors.department)}
                />
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={profileLoading}
                  icon={Save}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      )}

      {/* Tab 2: Security & Change Password */}
      {activeTab === 'security' && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              Change Password
            </Card.Title>
            <Card.Description>
              Ensure your account is using a strong password of at least 8 characters.
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <FormField
                label="Current Password"
                required
                id="curr-pass"
                error={passwordErrors.currentPassword}
              >
                <Input
                  id="curr-pass"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  error={Boolean(passwordErrors.currentPassword)}
                />
              </FormField>

              <FormField
                label="New Password"
                required
                id="new-pass"
                hint="Minimum 8 characters with at least 1 letter and 1 number"
                error={passwordErrors.newPassword}
              >
                <Input
                  id="new-pass"
                  type="password"
                  placeholder="••••••••"
                  icon={KeyRound}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={Boolean(passwordErrors.newPassword)}
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                required
                id="conf-pass"
                error={passwordErrors.confirmPassword}
              >
                <Input
                  id="conf-pass"
                  type="password"
                  placeholder="••••••••"
                  icon={KeyRound}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={Boolean(passwordErrors.confirmPassword)}
                />
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={passwordLoading}
                  icon={Shield}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}

export default ProfilePage;
