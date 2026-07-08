import { useEffect, useRef, useMemo } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function useRealtime(table, queryClient, queryKey, options = {}) {
  const keyStr = useMemo(() => JSON.stringify(queryKey), [queryKey]);
  const optionsRef = useRef(options);
  const queryClientRef = useRef(queryClient);
  const queryKeyRef = useRef(queryKey);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    queryClientRef.current = queryClient;
    queryKeyRef.current = queryKey;
  });

  useEffect(() => {
    if (!isConfigured()) return;

    let channel;
    try {
      channel = supabase
        .channel(`${table}-${keyStr}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            const opts = optionsRef.current;
            if (payload.eventType === 'INSERT' && opts.onInsert) opts.onInsert(payload);
            if (payload.eventType === 'UPDATE' && opts.onUpdate) opts.onUpdate(payload);
            if (payload.eventType === 'DELETE' && opts.onDelete) opts.onDelete(payload);
            queryClientRef.current.invalidateQueries({ queryKey: queryKeyRef.current });
          }
        )
        .subscribe();
    } catch (err) {
      console.warn(`Realtime subscription failed for ${table}:`, err);
      return;
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [table, keyStr]);
}
