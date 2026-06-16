import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';
import { ordensServico as mockOS } from '../data/mockData';

export function useOrdensServico(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['ordensServico', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return mockOS;
      let q = supabase.from('ordens_servico').select('*');
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.search) {
        q = q.or(`cliente.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      return (data || []).map(toCamel);
    },
    enabled: true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useRealtime('ordens_servico', queryClient, queryKey);

  return {
    data: query.data || mockOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newOS) => {
      if (!isConfigured()) {
        return { id: `OS-${String(mockOS.length + 1).padStart(3, '0')}`, ...newOS };
      }
      const payload = toSnake({
        cliente: newOS.cliente,
        equipamento: newOS.equipamento,
        tipo: newOS.tipo,
        status: newOS.status || 'pendente',
        prioridade: newOS.prioridade || 'normal',
        tecnico: newOS.tecnico,
        abertura: newOS.abertura || new Date().toISOString().split('T')[0],
        previsao: newOS.previsao,
        valor: newOS.valor || 0,
        observacoes: newOS.observacoes,
      });
      const { data, error } = await supabase.from('ordens_servico').insert(payload).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordensServico'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) return { id, ...updates };
      const payload = toSnake(updates);
      const { data, error } = await supabase.from('ordens_servico').update(payload).eq('id', id).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordensServico'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) return;
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw handleSupabaseError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordensServico'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
