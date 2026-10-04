import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  Inbox,
  BarChart3,
  FileText,
  FolderKanban,
  Users,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Building2,
  User,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { classNames } from '../../lib/classNames';
import { ROLE_LABELS } from '../../lib/constants';
import { Badge } from '../ui/Badge';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const handleLogout = () => {
    closeAllMenus();
    logout();
    toast.success('You have been logged out.');
    navigate('/login', { replace: true });
  };

  // Define role-specific navigation items
  const getNavItems = () => {
    const items = [];

    // Complainant items (student and staff)
    if (role === 'student' || role === 'staff') {
      items.push(
        { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { name: 'File Complaint', to: '/complaints/new', icon: FilePlus2 }
      );
    }

    // Officer items
    if (role === 'officer') {
      items.push({ name: 'My Queue', to: '/officer', icon: Inbox });
    }

    // Admin items
    if (role === 'admin') {
      items.push(
        { name: 'Analytics', to: '/admin', icon: BarChart3 },
        { name: 'All Complaints', to: '/admin/complaints', icon: FileText },
        { name: 'Categories', to: '/admin/categories', icon: FolderKanban },
        { name: 'Users', to: '/admin/users', icon: Users }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const userDisplayName = user?.name || 'Campus User';
  const userRoleLabel = ROLE_LABELS[role] || (role ? role : 'User');
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const getRoleBadgeVariant = (userRole) => {
    switch (userRole) {
      case 'admin':
        return 'rose';
      case 'officer':
        return 'amber';
      case 'staff':
        return 'sky';
      case 'student':
      default:
        return 'indigo';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={closeAllMenus}
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeAllMenus}
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

          <div className="pt-4 border-t border-slate-100">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account
            </div>
            <NavLink
              to="/profile"
              onClick={closeAllMenus}
              className={classNames(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/profile'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <User className="h-5 w-5 text-slate-400" />
              <span>My Profile</span>
            </NavLink>
          </div>
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={getRoleBadgeVariant(role)} size="sm">
                    {userRoleLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
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

            <div className="pt-4 border-t border-slate-100">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                General
              </div>
              <NavLink
                to="/profile"
                className={classNames(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === '/profile'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <User
                  className={classNames(
                    'h-4.5 w-4.5 shrink-0',
                    location.pathname === '/profile' ? 'text-indigo-600' : 'text-slate-400'
                  )}
                />
                <span>Profile</span>
              </NavLink>
            </div>
          </nav>

          {/* User profile card at bottom of desktop sidebar */}
          {user && (
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
                      <span className="inline-flex items-center gap-0.5 text-slate-400 truncate">
                        • {user.department}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
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
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
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

            {/* Top Bar User Menu */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100 transition-colors cursor-pointer select-none"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-sm font-semibold text-slate-900 leading-tight">
                        {userDisplayName}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <Badge variant={getRoleBadgeVariant(role)} size="sm">
                          {userRoleLabel}
                        </Badge>
                        {user.department && (
                          <span className="text-[11px] text-slate-500 hidden md:inline-flex items-center gap-0.5">
                            <Building2 className="h-3 w-3" />
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white font-medium text-xs shadow-xs">
                      {userInitials}
                    </div>

                    <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 animate-fadeIn border border-slate-100">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1 sm:hidden">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={closeAllMenus}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>Profile & Settings</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Main Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
