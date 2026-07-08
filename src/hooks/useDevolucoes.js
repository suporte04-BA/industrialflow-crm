import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { devolucoes as mockDevolucoes } from '../data/mockData';
import { useRealtime } from './useRealtime';

const LOCAL_KEY = 'devolucoes_local';

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export function useDevolucoes(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['devolucoes', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        const stored = getLocal();
        let data = stored.length > 0 ? [...stored] : [...mockDevolucoes];
        if (filters.comprovanteId) data = data.filter((d) => d.comprovanteId === filters.comprovanteId);
        if (filters.contratoId) data = data.filter((d) => d.contratoId === filters.contratoId);
        if (filters.status) data = data.filter((d) => d.status === filters.status);
        if (filters.search) {
          const term = filters.search.toLowerCase();
          data = data.filter((d) =>
            (d.locatario || '').toLowerCase().includes(term) ||
            (d.numero || '').toLowerCase().includes(term) ||
            (d.signatarioNome || '').toLowerCase().includes(term)
          );
        }
        return data;
      }

      try {
        let q = supabase.from('devolucoes').select('*');
        if (filters.comprovanteId) q = q.eq('comprovante_id', filters.comprovanteId);
        if (filters.contratoId) q = q.eq('contrato_id', filters.contratoId);
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.search) {
          q = q.or(`locatario.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,signatario_nome.ilike.%${filters.search}%`);
        }
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(toCamel);
      } catch {
        const stored = getLocal();
        let data = [...stored];
        if (filters.comprovanteId) data = data.filter((d) => d.comprovanteId === filters.comprovanteId);
        if (filters.contratoId) data = data.filter((d) => d.contratoId === filters.contratoId);
        if (filters.status) data = data.filter((d) => d.status === filters.status);
        if (filters.search) {
          const term = filters.search.toLowerCase();
          data = data.filter((d) =>
            (d.locatario || '').toLowerCase().includes(term) ||
            (d.numero || '').toLowerCase().includes(term) ||
            (d.signatarioNome || '').toLowerCase().includes(term)
          );
        }
        return data;
      }
    },
    staleTime: 30000,
  });

  useRealtime('devolucoes', queryClient, queryKey);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateDevolucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (devolucao) => {
      if (isConfigured()) {
        try {
          const id = `DEV-${String(Date.now()).slice(-6)}`;
          const payload = toSnake({ ...devolucao, id, status: devolucao.status || 'pendente' });
          const { data, error } = await supabase.from('devolucoes').insert(payload).select().single();
          if (error) throw error;
          return toCamel(data);
        } catch {
          const local = { id: `DEV-${String(Date.now()).slice(-6)}`, ...devolucao, status: devolucao.status || 'pendente', createdAt: new Date().toISOString() };
          const stored = getLocal();
          stored.unshift(local);
          saveLocal(stored);
          return local;
        }
      }
      const local = { id: `DEV-${String(Date.now()).slice(-6)}`, ...devolucao, status: devolucao.status || 'pendente', createdAt: new Date().toISOString() };
      const stored = getLocal();
      stored.unshift(local);
      saveLocal(stored);
      return local;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
}

export function useUpdateDevolucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (isConfigured()) {
        try {
          const payload = toSnake(updates);
          const { data, error } = await supabase.from('devolucoes').update(payload).eq('id', id).select().single();
          if (error) throw error;
          return toCamel(data);
        } catch {
          const stored = getLocal();
          const idx = stored.findIndex((d) => d.id === id);
          if (idx !== -1) { stored[idx] = { ...stored[idx], ...updates }; saveLocal(stored); }
          return { id, ...updates };
        }
      }
      const stored = getLocal();
      const idx = stored.findIndex((d) => d.id === id);
      if (idx !== -1) { stored[idx] = { ...stored[idx], ...updates }; saveLocal(stored); }
      return { id, ...updates };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
}

export function useDeleteDevolucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (isConfigured()) {
        try {
          const { error } = await supabase.from('devolucoes').delete().eq('id', id);
          if (error) throw error;
          return id;
        } catch {
          const stored = getLocal().filter((d) => d.id !== id);
          saveLocal(stored);
          return id;
        }
      }
      const stored = getLocal().filter((d) => d.id !== id);
      saveLocal(stored);
      return id;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
  });
}
