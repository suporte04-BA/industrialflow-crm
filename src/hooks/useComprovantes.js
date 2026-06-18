import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { useRealtime } from './useRealtime';

export function useComprovantes() {
  const queryClient = useQueryClient();
  const queryKey = ['comprovantes'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return [];
      const { data, error } = await supabase
        .from('comprovantes_entrega')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data || []).map(toCamel);
    },
    staleTime: 5000,
    retry: 1,
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

      if (!isConfigured()) {
        throw new Error('Supabase nao configurado. Verifique o arquivo .env');
      }

      const { data, error } = await supabase
        .from('comprovantes_entrega')
        .insert(payload)
        .select()
        .single();
      if (error) {
        throw error;
      }
      return toCamel(data);
    },
    onMutate: async (newComp) => {
      await queryClient.cancelQueries({ queryKey: ['comprovantes'] });
      const previous = queryClient.getQueryData(['comprovantes']);
      const optimisticItem = {
        id: 'temp-' + Date.now(),
        ...newComp,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['comprovantes'], (old) => [optimisticItem, ...(old || [])]);
      return { previous };
    },
    onError: (err, newComp, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comprovantes'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}

export function useUpdateComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) throw new Error('Supabase nao configurado');
      const payload = toSnake(updates);
      const { data, error } = await supabase
        .from('comprovantes_entrega')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toCamel(data);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['comprovantes'] });
      const previous = queryClient.getQueryData(['comprovantes']);
      queryClient.setQueryData(['comprovantes'], (old) =>
        (old || []).map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comprovantes'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}

export function useDeleteComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) throw new Error('Supabase nao configurado');
      const { error } = await supabase.from('comprovantes_entrega').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['comprovantes'] });
      const previous = queryClient.getQueryData(['comprovantes']);
      queryClient.setQueryData(['comprovantes'], (old) =>
        (old || []).filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comprovantes'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}
