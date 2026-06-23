import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

export default function RoleGuard({ children, requiredRole }) {
  const { profile, viewRole, isLoadingAuth } = useAuth();
  const activeRole = viewRole || profile?.role;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const isAuthorized = activeRole === 'admin' || activeRole === requiredRole;

  if (!isAuthorized) {
    return <Navigate to="/comprovantes" replace />;
  }

  return children;
}
