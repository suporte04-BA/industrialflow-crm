import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, isConfigured } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isConfigured()) {
        // Mock mode: allow access without auth
        setUser({ id: 'mock-user', email: 'admin@crm.com' });
        setLoading(false);
        return;
      }
      const { user } = await getCurrentUser();
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
