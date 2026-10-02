import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { UiKitPage } from '../pages/UiKitPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="complaints/new"
          element={<PlaceholderPage title="File Complaint" feature="Complaint submission form" />}
        />
        <Route
          path="queue"
          element={<PlaceholderPage title="Officer Queue" feature="Officer grievance triage queue" />}
        />
        <Route
          path="admin/analytics"
          element={<PlaceholderPage title="Admin Analytics" feature="Global system metrics and trends" />}
        />
        <Route
          path="admin/complaints"
          element={<PlaceholderPage title="All Complaints" feature="Campus-wide grievance management" />}
        />
        <Route
          path="admin/categories"
          element={<PlaceholderPage title="Categories" feature="Grievance categories and triage settings" />}
        />
        <Route
          path="admin/users"
          element={<PlaceholderPage title="User Management" feature="Campus user directory and roles" />}
        />
        <Route path="ui-kit" element={<UiKitPage />} />
        <Route
          path="login"
          element={<PlaceholderPage title="Authentication" feature="Login and registration forms" />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
