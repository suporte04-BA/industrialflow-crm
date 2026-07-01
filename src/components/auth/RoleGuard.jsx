import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

export default function RoleGuard({ children, requiredRole }) {
  const { profile, isLoadingAuth } = useAuth();
  const activeRole = profile?.role;

  if (isLoadingAuth || (!activeRole && useAuth().isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      </div>
    );
  }

  const isAuthorized = activeRole === 'admin' || activeRole === requiredRole;

  if (!isAuthorized) {
    return <Navigate to="/comprovantes" replace />;
  }

  return children;
}
