import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';

export function useNotas() {
  const queryClient = useQueryClient();
  const queryKey = ['notas'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) return [];
      const { data, error } = await supabase.from('notas').select('*').order('updated_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      return (data || []).map(toCamel);
    },
    staleTime: 30000,
  });

  useRealtime('notas', queryClient, queryKey);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newNota) => {
      if (!isConfigured()) return { id: crypto.randomUUID(), titulo: 'Sem titulo', conteudo: '', ...newNota };
      const payload = toSnake({
        titulo: newNota.titulo || 'Sem titulo',
        conteudo: newNota.conteudo || '',
      });
      const { data, error } = await supabase.from('notas').insert(payload).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
    },
  });
}

export function useUpdateNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!isConfigured()) return { id, ...updates };
      const payload = toSnake({
        titulo: updates.titulo,
        conteudo: updates.conteudo,
      });
      const { data, error } = await supabase.from('notas').update(payload).eq('id', id).select().single();
      if (error) throw handleSupabaseError(error);
      return toCamel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
    },
  });
}

export function useDeleteNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) return;
      const { error } = await supabase.from('notas').delete().eq('id', id);
      if (error) throw handleSupabaseError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
    },
  });
}
