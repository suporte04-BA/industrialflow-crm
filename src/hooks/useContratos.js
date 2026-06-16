import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake, computeVencimentoDias } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';
import { contratos as mockContratos } from '../data/mockData';

export function useContratos(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['contratos', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return mockContratos;
      let q = supabase.from('contratos').select('*');
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.search) {
        q = q.or(`cliente.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      return (data || []).map((c) => {
        const camel = toCamel(c);
        camel.vencimentoDias = computeVencimentoDias(camel.fim);
        return camel;
      });
    },
    staleTime: 30000,
  });

  useRealtime('contratos', queryClient, queryKey);

  return {
    data: query.data || mockContratos,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCt) => {
      if (!isConfigured()) return { id: `CT-${String(mockContratos.length + 1).padStart(3, '0')}`, ...newCt };
      const payload = toSnake({
        cliente: newCt.cliente,
        cnpj: newCt.cnpj,
        equipamentos: newCt.equipamentos || [],
        inicio: newCt.inicio,
        fim: newCt.fim,
        valorTotal: newCt.valorTotal || 0,
        valorMensal: newCt.valorMensal || 0,
        status: newCt.status || 'ativo',
        assinado: newCt.assinado || false,
      });
      const { data, error } = await supabase.from('contratos').insert(payload).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) return { id, ...updates };
      const payload = toSnake(updates);
      const { data, error } = await supabase.from('contratos').update(payload).eq('id', id).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) return;
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) throw handleSupabaseError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
