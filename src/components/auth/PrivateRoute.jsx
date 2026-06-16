import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isConfigured, getCurrentUser } from '../../lib/supabase';

export default function PrivateRoute({ children }) {
  const [authState, setAuthState] = useState({ loading: true, authenticated: false });

  useEffect(() => {
    const checkAuth = async () => {
      if (!isConfigured()) {
        const mockAuth = localStorage.getItem('industrialflow_mock_auth');
        setAuthState({ loading: false, authenticated: !!mockAuth });
        return;
      }
      try {
        const { user } = await getCurrentUser();
        setAuthState({ loading: false, authenticated: !!user });
      } catch {
        setAuthState({ loading: false, authenticated: false });
      }
    };
    checkAuth();
  }, []);

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authState.authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
