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
      if (!isConfigured()) {
        const stored = getLocal();
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
      let q = supabase.from('assinaturas').select('*');
      if (comprovanteId) q = q.eq('comprovante_id', comprovanteId);
      const { data, error } = await q.order('data_assinatura', { ascending: false });
      if (error) {
        const stored = getLocal();
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
      return (data || []).map(toCamel);
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
    mutationFn: async ({ comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem }) => {
      if (isConfigured()) {
        try {
          const payload = toSnake({
            comprovanteId,
            nomeSignatario,
            cpfSignatario,
            assinaturaImagem: assinaturaImagem || null,
            ipAddress: null,
            dataAssinatura: new Date().toISOString(),
          });
          const { data, error } = await supabase.from('assinaturas').insert(payload).select().single();
          if (error) throw error;
          return toCamel(data);
        } catch {
          const local = { id: crypto.randomUUID(), comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem, dataAssinatura: new Date().toISOString() };
          const stored = getLocal();
          stored.unshift(local);
          saveLocal(stored);
          return local;
        }
      }

      const local = { id: crypto.randomUUID(), comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem, dataAssinatura: new Date().toISOString() };
      const stored = getLocal();
      stored.unshift(local);
      saveLocal(stored);
      return local;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
