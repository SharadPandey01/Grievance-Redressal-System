import { Routes, Route, Navigate } from 'react-router-dom';
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
import { UiKitPage } from '../pages/UiKitPage';

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
  return (
    <Routes>
      {/* Public Only Auth Routes */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Standalone Error Routes */}
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Protected App Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Root Redirect to Role Default */}
          <Route path="/" element={<RootIndexRedirect />} />

          {/* Complainant Routes (Student & Staff) */}
          <Route element={<RoleRoute allowedRoles={['student', 'staff']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/complaints/new" element={<NewComplaintPage />} />
          </Route>

          {/* Officer Routes */}
          <Route element={<RoleRoute allowedRoles={['officer']} />}>
            <Route path="/officer" element={<OfficerQueuePage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* Common Authenticated Routes */}
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ui-kit" element={<UiKitPage />} />
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
