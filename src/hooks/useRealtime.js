import { useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function useRealtime(table, queryClient, queryKey, options = {}) {
  useEffect(() => {
    if (!isConfigured()) return;

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (options.onInsert) options.onInsert(payload);
          if (options.onUpdate) options.onUpdate(payload);
          if (options.onDelete) options.onDelete(payload);
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, queryClient, queryKey]);
}
