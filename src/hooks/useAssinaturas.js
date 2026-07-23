import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { useRealtime } from './useRealtime';

const LOCAL_KEY = 'assinaturas_local';

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export function useAssinaturas(comprovanteId = null) {
  const queryClient = useQueryClient();
  const queryKey = ['assinaturas', { comprovanteId }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const stored = getLocal();
      if (!isConfigured()) {
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
      try {
        let q = supabase.from('assinaturas').select('*');
        if (comprovanteId) q = q.eq('comprovante_id', comprovanteId);
        const { data, error } = await q.order('data_assinatura', { ascending: false });
        if (error) {
          console.warn('[useAssinaturas] Supabase query error, falling back to localStorage:', error.message);
          return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
        }
        const dbData = (data || []).map(toCamel);
        if (comprovanteId) {
          const dbIds = new Set(dbData.map((d) => d.comprovanteId));
          const localOnly = stored.filter((s) => s.comprovanteId === comprovanteId && !dbIds.has(s.comprovanteId));
          return [...localOnly, ...dbData];
        }
        const dbIds = new Set(dbData.map((d) => d.comprovanteId));
        const localOnly = stored.filter((s) => !dbIds.has(s.comprovanteId));
        return [...localOnly, ...dbData];
      } catch (err) {
        console.warn('[useAssinaturas] Network error, falling back to localStorage:', err);
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
    },
    staleTime: 30000,
  });

  useRealtime('assinaturas', queryClient, queryKey);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateAssinatura() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem, funcionarioId, fotosEntrega, fotosRetirada }) => {
      const localData = { id: crypto.randomUUID(), comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem, dataAssinatura: new Date().toISOString(), funcionarioId: funcionarioId || null, fotosEntrega: fotosEntrega || [], fotosRetirada: fotosRetirada || [] };

      if (isConfigured()) {
        try {
          const payload = toSnake({
            comprovanteId,
            nomeSignatario,
            cpfSignatario,
            assinaturaImagem: assinaturaImagem || null,
            ipAddress: null,
            dataAssinatura: new Date().toISOString(),
            funcionarioId: funcionarioId || null,
            fotosEntrega: fotosEntrega || [],
            fotosRetirada: fotosRetirada || [],
          });
          const { data, error } = await supabase.from('assinaturas').insert(payload).select().single();
          if (error) {
            console.error('[useCreateAssinatura] Supabase insert failed:', error.message, error);
            const stored = getLocal();
            stored.unshift(localData);
            saveLocal(stored);
            return localData;
          }
          return toCamel(data);
        } catch (err) {
          console.error('[useCreateAssinatura] Network error during insert:', err);
          const stored = getLocal();
          stored.unshift(localData);
          saveLocal(stored);
          return localData;
        }
      }

      const stored = getLocal();
      stored.unshift(localData);
      saveLocal(stored);
      return localData;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
