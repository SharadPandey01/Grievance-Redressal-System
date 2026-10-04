import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { AppLayout } from '../components/layout/AppLayout';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NewComplaintPage } from '../pages/NewComplaintPage';
import { ComplaintDetailPage } from '../pages/ComplaintDetailPage';
import { OfficerQueuePage } from '../pages/OfficerQueuePage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminComplaintsPage } from '../pages/AdminComplaintsPage';
import { AdminCategoriesPage } from '../pages/AdminCategoriesPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';

function RootIndexRedirect() {
  const { role } = useAuth();
  switch (role) {
    case 'student':
    case 'staff':
      return <Navigate to="/dashboard" replace />;
    case 'officer':
      return <Navigate to="/officer" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/dashboard': 'Dashboard',
      '/complaints/new': 'File a Complaint',
      '/officer': 'Officer Queue',
      '/admin': 'Analytics Dashboard',
      '/admin/complaints': 'All Complaints',
      '/admin/categories': 'Categories Management',
      '/admin/users': 'Users Management',
      '/profile': 'User Profile',
      '/login': 'Sign In',
      '/register': 'Register Account',
      '/403': 'Access Denied',
    };

    let title = 'Campus Grievance Redressal System';
    if (location.pathname.startsWith('/complaints/')) {
      title = 'Complaint Details | Campus Grievance System';
    } else if (titles[location.pathname]) {
      title = `${titles[location.pathname]} | Campus Grievance System`;
    }
    document.title = title;
  }, [location.pathname]);

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RootIndexRedirect />} />

          <Route element={<RoleRoute allowedRoles={['student', 'staff']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/complaints/new" element={<NewComplaintPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['officer']} />}>
            <Route path="/officer" element={<OfficerQueuePage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
