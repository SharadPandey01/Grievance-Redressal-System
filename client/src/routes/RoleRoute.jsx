import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ForbiddenPage } from '../pages/ForbiddenPage';

export function RoleRoute({ allowedRoles = [] }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}

export default RoleRoute;
