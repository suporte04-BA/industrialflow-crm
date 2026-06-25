import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { useRealtime } from './useRealtime';

export function useAssinaturas(comprovanteId = null) {
  const queryClient = useQueryClient();
  const queryKey = ['assinaturas', { comprovanteId }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        const stored = JSON.parse(localStorage.getItem('assinaturas_local') || '[]');
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
      let q = supabase.from('assinaturas').select('*');
      if (comprovanteId) q = q.eq('comprovante_id', comprovanteId);
      const { data, error } = await q.order('data_assinatura', { ascending: false });
      if (error) {
        const stored = JSON.parse(localStorage.getItem('assinaturas_local') || '[]');
        return comprovanteId ? stored.filter((s) => s.comprovanteId === comprovanteId) : stored;
      }
      return (data || []).map(toCamel);
    },
    staleTime: 5000,
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
          const stored = JSON.parse(localStorage.getItem('assinaturas_local') || '[]');
          stored.unshift(local);
          localStorage.setItem('assinaturas_local', JSON.stringify(stored));
          return local;
        }
      }

      const local = { id: crypto.randomUUID(), comprovanteId, nomeSignatario, cpfSignatario, assinaturaImagem, dataAssinatura: new Date().toISOString() };
      const stored = JSON.parse(localStorage.getItem('assinaturas_local') || '[]');
      stored.unshift(local);
      localStorage.setItem('assinaturas_local', JSON.stringify(stored));
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
