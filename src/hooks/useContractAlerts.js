import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export function useContractAlerts() {
  const { user, isAuthenticated } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !isAuthenticated || !user) return;
    ran.current = true;

    const checkAlerts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        await fetch('/api/contracts/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch {
        // Alert check is best-effort, never block the UI
      }
    };

    const timer = setTimeout(checkAlerts, 3000);
    return () => clearTimeout(timer);
  }, [user, isAuthenticated]);
}
