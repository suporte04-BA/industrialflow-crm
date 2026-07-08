import { useState, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { supabase, isConfigured, loadConfig } from './supabase';
import { toCamel } from './converters';

const AuthContext = createContext();

async function fetchProfile(userObj, accessToken) {
  if (!isConfigured() || !userObj?.id) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userObj.id)
      .single();
    if (!error && data) return toCamel(data);
  } catch { /* fallback to Worker */ }

  if (accessToken) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
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
    } catch { /* Worker unavailable */ }
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const profileLoaded = useRef(null);
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    let mounted = true;
    let subscription = null;

    const init = async () => {
      try {
        await loadConfig();
      } catch {
        console.warn('[AuthContext] loadConfig failed, using defaults');
      }

      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessErr) console.warn('[AuthContext] getSession error:', sessErr.message);
        let currentUser = session?.user ?? null;

        if (!currentUser) {
          const { data: { user }, error: userErr } = await supabase.auth.getUser();
          if (userErr) console.warn('[AuthContext] getUser error:', userErr.message);
          currentUser = user ?? null;
        }

        setUser(currentUser);
        setIsAuthenticated(!!currentUser);

        if (currentUser) {
          const prof = await fetchProfile(currentUser, session?.access_token);
          if (mounted) setProfile(prof);
        }
      } catch (err) {
        console.warn('[AuthContext] init exception:', err.message);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }

      try {
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              fetchProfile(currentUser, session?.access_token).then(prof => {
                if (mounted) setProfile(prof);
              });
            }
            if (event === 'SIGNED_OUT') {
              setProfile(null);
            }
          }
        );
        subscription = sub;
      } catch (err) {
        console.warn('[AuthContext] onAuthStateChange failed:', err.message);
      }
    };

    init();

    return () => {
      mounted = false;
      if (subscription) {
        try { subscription.unsubscribe(); } catch { /* ignore */ }
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !isConfigured()) {
      if (!user) {
        profileLoaded.current = null;
        queueMicrotask(() => setProfile(null));
      }
      return;
    }

    if (profileLoaded.current === user.id) return;
    profileLoaded.current = user.id;

    let cancelled = false;
    const loadProfile = async () => {
      try {
        const session = (await supabase.auth.getSession()).data?.session;
        if (cancelled) return;
        const prof = await fetchProfile(user, session?.access_token);
        if (!cancelled) setProfile(prof);
      } catch (err) {
        console.warn('[AuthContext] loadProfile failed:', err.message);
        if (!cancelled) setProfile(null);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  const logout = async () => {
    if (isConfigured()) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    localStorage.removeItem('transobra_mock_auth');
    localStorage.removeItem('transobra_mock_role');
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    profileLoaded.current = null;
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
