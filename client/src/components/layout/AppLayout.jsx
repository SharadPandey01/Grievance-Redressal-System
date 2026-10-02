import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  Inbox,
  BarChart3,
  FileText,
  FolderKanban,
  Users,
  Palette,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { classNames } from '../../lib/classNames';
import { ROLE_LABELS } from '../../lib/constants';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const location = useLocation();

  // Define role-specific navigation items
  const getNavItems = () => {
    const items = [];

    // Complainant items
    if (role === 'student' || role === 'staff') {
      items.push(
        { name: 'Dashboard', to: '/', icon: LayoutDashboard },
        { name: 'File Complaint', to: '/complaints/new', icon: FilePlus2 }
      );
    }

    // Officer items
    if (role === 'officer') {
      items.push({ name: 'My Queue', to: '/queue', icon: Inbox });
    }

    // Admin items
    if (role === 'admin') {
      items.push(
        { name: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
        { name: 'All Complaints', to: '/admin/complaints', icon: FileText },
        { name: 'Categories', to: '/admin/categories', icon: FolderKanban },
        { name: 'Users', to: '/admin/users', icon: Users }
      );
    }

    // Fallback for unauthenticated or development preview: show combined items or UI kit
    if (!role) {
      items.push(
        { name: 'Dashboard', to: '/', icon: LayoutDashboard },
        { name: 'File Complaint', to: '/complaints/new', icon: FilePlus2 },
        { name: 'My Queue (Officer)', to: '/queue', icon: Inbox },
        { name: 'Admin Analytics', to: '/admin/analytics', icon: BarChart3 }
      );
    }

    // Always include UI Kit link in development
    items.push({ name: 'UI Kit (Dev)', to: '/ui-kit', icon: Palette });

    return items;
  };

  const navItems = getNavItems();

  const userDisplayName = user?.name || 'Guest User';
  const userRoleLabel = ROLE_LABELS[role] || (role ? role : 'Visitor');
  const userInitials = userDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={classNames(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">
              Campus Redressal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={classNames(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={classNames(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  )}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {userDisplayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{userRoleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 bg-white border-r border-slate-200">
          <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base tracking-tight leading-tight">
                Campus Grievance
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Redressal Portal
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={classNames(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={classNames(
                      'h-4.5 w-4.5 shrink-0',
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    )}
                  />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User profile card at bottom of desktop sidebar */}
          {user ? (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs ring-2 ring-white">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {userDisplayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    {userRoleLabel}
                    {user.department && (
                      <span className="inline-flex items-center gap-0.5 text-slate-400">
                        • {user.department}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center">
              Campus Complaint System
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="lg:hidden flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-slate-900 text-sm">
                  Campus Redressal
                </span>
              </div>
            </div>

            {/* Top Bar Right side */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {userRoleLabel}
                    {user.department && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {user.department}
                      </span>
                    )}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-medium text-xs">
                    {userInitials}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  Welcome, Guest
                </div>
              )}
            </div>
          </header>

          {/* Main page content container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
