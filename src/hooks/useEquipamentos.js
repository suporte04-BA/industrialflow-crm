import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';
import { equipamentos as mockEq } from '../data/mockData';

export function useEquipamentos(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['equipamentos', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return mockEq;
      let q = supabase.from('equipamentos').select('*');
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.search) {
        q = q.or(`nome.ilike.%${filters.search}%,categoria.ilike.%${filters.search}%,patrimonio.ilike.%${filters.search}%`);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      return (data || []).map(toCamel);
    },
    staleTime: 30000,
  });

  useRealtime('equipamentos', queryClient, queryKey);

  return {
    data: query.data || mockEq,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newEq) => {
      if (!isConfigured()) return { id: `EQ-${String(mockEq.length + 1).padStart(3, '0')}`, ...newEq };
      const payload = toSnake({
        nome: newEq.nome,
        categoria: newEq.categoria,
        status: newEq.status || 'disponivel',
        patrimonio: newEq.patrimonio || '',
        cliente: newEq.cliente || '-',
        contrato: newEq.contrato || '-',
        locacaoInicio: newEq.locacaoInicio,
        locacaoFim: newEq.locacaoFim,
        valorMensal: newEq.valorMensal || 0,
        horasUso: newEq.horasUso || 0,
        ultimaRevisao: newEq.ultimaRevisao,
      });
      const { data, error } = await supabase.from('equipamentos').insert(payload).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) return { id, ...updates };
      const payload = toSnake(updates);
      const { data, error } = await supabase.from('equipamentos').update(payload).eq('id', id).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) return;
      const { error } = await supabase.from('equipamentos').delete().eq('id', id);
      if (error) throw handleSupabaseError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
