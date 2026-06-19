import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake, computeVencimentoDias } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';

const LOCAL_KEY = 'contratos_local';

function getLocal() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
}

function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function saveToLocal(item) {
  const stored = getLocal();
  stored.unshift(item);
  saveLocal(stored);
}

function updateLocal(id, updates) {
  const stored = getLocal();
  const idx = stored.findIndex((c) => c.id === id);
  if (idx >= 0) stored[idx] = { ...stored[idx], ...updates };
  saveLocal(stored);
}

function deleteLocal(id) {
  const stored = getLocal();
  saveLocal(stored.filter((c) => c.id !== id));
}

export function useContratos(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['contratos', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        return getLocal();
      }
      let q = supabase.from('contratos').select('*');
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters.search) {
        q = q.or(`cliente.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw handleSupabaseError(error);
      const items = (data || []).map((c) => {
        const camel = toCamel(c);
        camel.vencimentoDias = computeVencimentoDias(camel.fim);
        return camel;
      });
      saveLocal(items);
      return items;
    },
    staleTime: 30000,
  });

  useRealtime('contratos', queryClient, queryKey);

  return {
    data: query.data || [],
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
      const id = `CT-${String(getLocal().length + 1).padStart(3, '0')}`;
      const item = {
        id,
        cliente: newCt.cliente,
        cnpj: newCt.cnpj,
        equipamentos: newCt.equipamentos || [],
        inicio: newCt.inicio,
        fim: newCt.fim,
        valorTotal: newCt.valorTotal || 0,
        valorMensal: newCt.valorMensal || 0,
        status: newCt.status || 'ativo',
        assinado: newCt.assinado || false,
        endereco: newCt.endereco || '',
        bairro: newCt.bairro || '',
        cidade: newCt.cidade || '',
        estado: newCt.estado || '',
        cep: newCt.cep || '',
        telefone: newCt.telefone || '',
        email: newCt.email || '',
        contato: newCt.contato || '',
        createdAt: new Date().toISOString(),
      };

      if (isConfigured()) {
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
          endereco: newCt.endereco || '',
          bairro: newCt.bairro || '',
          cidade: newCt.cidade || '',
          estado: newCt.estado || '',
          cep: newCt.cep || '',
          telefone: newCt.telefone || '',
          email: newCt.email || '',
          contato: newCt.contato || '',
        });
        const { data, error } = await supabase.from('contratos').insert(payload).select().single();
        if (error) throw handleSupabaseError(error);
        return toCamel(data);
      }

      saveToLocal(item);
      return item;
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
      if (isConfigured()) {
        const payload = toSnake(updates);
        const { data, error } = await supabase.from('contratos').update(payload).eq('id', id).select().single();
        if (error) throw handleSupabaseError(error);
        return toCamel(data);
      }
      updateLocal(id, updates);
      return { id, ...updates };
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
      if (isConfigured()) {
        const { error } = await supabase.from('contratos').delete().eq('id', id);
        if (error) throw handleSupabaseError(error);
      } else {
        deleteLocal(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
