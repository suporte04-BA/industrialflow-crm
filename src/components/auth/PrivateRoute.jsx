import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Verificando acesso...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
