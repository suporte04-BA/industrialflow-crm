import { useState, createContext, useContext, useEffect } from 'react';
import { supabase, isConfigured } from './supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (!isConfigured()) {
      const mockAuth = localStorage.getItem('transobra_mock_auth');
      setUser(mockAuth ? { id: 'mock', email: 'admin@transobra.com' } : null);
      setIsAuthenticated(!!mockAuth);
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (isConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('transobra_mock_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  const loginAsDemo = () => {
    localStorage.setItem('transobra_mock_auth', 'true');
    setUser({ id: 'mock', email: 'admin@transobra.com' });
    setIsAuthenticated(true);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      logout,
      loginAsDemo,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
