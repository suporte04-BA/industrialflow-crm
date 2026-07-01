import { useState, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { supabase, isConfigured, loadConfig } from './supabase';
import { toCamel } from './converters';

const AuthContext = createContext();

async function fetchProfileWithRetry(userObj, accessToken, retries = 2) {
  if (!isConfigured()) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (accessToken) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwt: accessToken }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const { user: profileData } = await response.json();
          return toCamel(profileData);
        }
      }
    } catch {
      // Worker might be cold-starting, retry
    }

    // Fallback: query Supabase directly
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj?.id)
        .single();
      if (!error && data) return toCamel(data);
    } catch {
      // Supabase query failed
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const profileFetchAttempted = useRef(new Set());

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const init = async () => {
      await loadConfig();

      if (!isConfigured()) {
        const mockAuth = localStorage.getItem('transobra_mock_auth');
        const mockRole = localStorage.getItem('transobra_mock_role') || 'funcionario';
        if (mockAuth) {
          setUser({ id: 'mock', email: 'admin@transobra.com' });
          setProfile({ id: 'mock', role: mockRole, fullName: 'Admin TransObra', email: 'admin@transobra.com' });
          setIsAuthenticated(true);
        }
        if (mounted) setIsLoadingAuth(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setIsAuthenticated(!!currentUser);
        }
      );
      subscription = sub;
    };

    init();

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user || !isConfigured()) {
      if (!user) {
        profileFetchAttempted.current.clear();
      }
      return;
    }

    const cacheKey = user.id;
    if (profileFetchAttempted.current.has(cacheKey)) return;

    let cancelled = false;
    profileFetchAttempted.current.add(cacheKey);

    const loadProfile = async () => {
      const session = (await supabase.auth.getSession()).data?.session;
      if (cancelled) return;
      const prof = await fetchProfileWithRetry(user, session?.access_token, 2);
      if (!cancelled) setProfile(prof);
    };

    loadProfile();

    return () => { cancelled = true; };
  }, [user]);

  const logout = async () => {
    if (isConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('transobra_mock_auth');
    localStorage.removeItem('transobra_mock_role');
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    profileFetchAttempted.current.clear();
  };

  const loginAsDemo = (role = 'funcionario') => {
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
    const activeRole = profile?.role;
    if (!activeRole) return false;
    if (activeRole === 'admin') return true;
    return activeRole === requiredRole;
  };

  const isGestor = useMemo(() => {
    const activeRole = profile?.role;
    return activeRole === 'gestor' || activeRole === 'admin';
  }, [profile]);

  const isFuncionario = useMemo(() => {
    const activeRole = profile?.role;
    return activeRole === 'funcionario' || activeRole === 'user';
  }, [profile]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
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
