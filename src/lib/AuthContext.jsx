import { useState, createContext, useContext, useEffect, useMemo } from 'react';
import { supabase, isConfigured } from './supabase';
import { toCamel } from './converters';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [viewRole, setViewRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchProfile = async (userId) => {
    if (!isConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return toCamel(data);
    } catch {
      return null;
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isConfigured()) {
      const mockAuth = localStorage.getItem('transobra_mock_auth');
      const mockRole = localStorage.getItem('transobra_mock_role') || 'gestor';
      if (mockAuth) {
        setUser({ id: 'mock', email: 'admin@transobra.com' });
        setProfile({ id: 'mock', role: mockRole, fullName: 'Admin TransObra', email: 'admin@transobra.com' });
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id);
        setProfile(prof);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id);
        setProfile(prof);
      } else {
        setProfile(null);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = async () => {
    if (isConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('transobra_mock_auth');
    localStorage.removeItem('transobra_mock_role');
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const loginAsDemo = (role = 'gestor') => {
    localStorage.setItem('transobra_mock_auth', 'true');
    localStorage.setItem('transobra_mock_role', role);
    setUser({ id: 'mock', email: 'admin@transobra.com' });
    setProfile({ id: 'mock', role, fullName: 'Admin TransObra', email: 'admin@transobra.com' });
    setIsAuthenticated(true);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const hasRole = (requiredRole) => {
    const activeRole = viewRole || profile?.role;
    if (!activeRole) return false;
    if (activeRole === 'admin') return true;
    return activeRole === requiredRole;
  };

  const isGestor = useMemo(() => {
    const activeRole = viewRole || profile?.role;
    return activeRole === 'gestor' || activeRole === 'admin';
  }, [profile, viewRole]);

  const isFuncionario = useMemo(() => {
    const activeRole = viewRole || profile?.role;
    return activeRole === 'funcionario' || activeRole === 'user';
  }, [profile, viewRole]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      viewRole,
      setViewRole,
      isAuthenticated,
      isLoadingAuth,
      logout,
      loginAsDemo,
      navigateToLogin,
      hasRole,
      isGestor,
      isFuncionario,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
