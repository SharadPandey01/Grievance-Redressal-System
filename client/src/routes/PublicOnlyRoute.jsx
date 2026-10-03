import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function PublicOnlyRoute() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    switch (role) {
      case 'student':
      case 'staff':
        return <Navigate to="/dashboard" replace />;
      case 'officer':
        return <Navigate to="/officer" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
