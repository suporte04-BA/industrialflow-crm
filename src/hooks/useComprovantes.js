import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';

export function useComprovantes() {
  const queryClient = useQueryClient();
  const queryKey = ['comprovantes'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return [];
      const { data, error } = await supabase.from('comprovantes_entrega').select('*').order('created_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      return (data || []).map(toCamel);
    },
    staleTime: 30000,
  });

  useRealtime('comprovantes_entrega', queryClient, queryKey);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newComp) => {
      if (!isConfigured()) return { id: crypto.randomUUID(), ...newComp };
      const payload = toSnake({
        contrato: newComp.contrato,
        atendente: newComp.atendente,
        locatario: newComp.locatario,
        cpf: newComp.cpf,
        rg: newComp.rg,
        fone: newComp.fone,
        contato: newComp.contato,
        endereco: newComp.endereco,
        numero: newComp.numero,
        bairro: newComp.bairro,
        cidade: newComp.cidade,
        estado: newComp.estado,
        cep: newComp.cep,
        localEntrega: newComp.localEntrega,
        telefoneEntrega: newComp.telefoneEntrega,
        data: newComp.data,
        hora: newComp.hora,
        observacao: newComp.observacao,
        itens: newComp.itens || [],
        total: newComp.total || 0,
        status: newComp.status || 'pendente',
        assinado: newComp.assinado || false,
      });
      const { data, error } = await supabase.from('comprovantes_entrega').insert(payload).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}

export function useUpdateComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) return { id, ...updates };
      const payload = toSnake(updates);
      const { data, error } = await supabase.from('comprovantes_entrega').update(payload).eq('id', id).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}
