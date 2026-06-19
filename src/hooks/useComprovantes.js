import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { useRealtime } from './useRealtime';
import { comprovantes as mockComprovantes } from '../data/mockData';

export function useComprovantes() {
  const queryClient = useQueryClient();
  const queryKey = ['comprovantes'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        return JSON.parse(localStorage.getItem('comprovantes_local') || 'null') || mockComprovantes;
      }
      const { data, error } = await supabase
        .from('comprovantes_entrega')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        return JSON.parse(localStorage.getItem('comprovantes_local') || 'null') || mockComprovantes;
      }
      const items = (data || []).map(toCamel);
      localStorage.setItem('comprovantes_local', JSON.stringify(items));
      return items.length > 0 ? items : mockComprovantes;
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

function saveToLocal(item) {
  const stored = JSON.parse(localStorage.getItem('comprovantes_local') || '[]');
  stored.unshift(item);
  localStorage.setItem('comprovantes_local', JSON.stringify(stored));
}

function updateLocal(id, updates) {
  const stored = JSON.parse(localStorage.getItem('comprovantes_local') || '[]');
  const idx = stored.findIndex((c) => c.id === id);
  if (idx >= 0) stored[idx] = { ...stored[idx], ...updates };
  localStorage.setItem('comprovantes_local', JSON.stringify(stored));
}

function deleteLocal(id) {
  const stored = JSON.parse(localStorage.getItem('comprovantes_local') || '[]');
  localStorage.setItem('comprovantes_local', JSON.stringify(stored.filter((c) => c.id !== id)));
}

export function useCreateComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newComp) => {
      const payload = toSnake({
        contratoId: newComp.contratoId,
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

      if (isConfigured()) {
        try {
          const { data, error } = await supabase
            .from('comprovantes_entrega')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          return toCamel(data);
        } catch {
          const local = { id: crypto.randomUUID(), ...newComp, createdAt: new Date().toISOString() };
          saveToLocal(local);
          return local;
        }
      }

      const local = { id: crypto.randomUUID(), ...newComp, createdAt: new Date().toISOString() };
      saveToLocal(local);
      return local;
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
      if (isConfigured()) {
        try {
          const payload = toSnake(updates);
          const { data, error } = await supabase
            .from('comprovantes_entrega')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return toCamel(data);
        } catch {
          updateLocal(id, updates);
          return { id, ...updates };
        }
      }
      updateLocal(id, updates);
      return { id, ...updates };
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
      if (isConfigured()) {
        try {
          const { error } = await supabase.from('comprovantes_entrega').delete().eq('id', id);
          if (error) throw error;
        } catch {
          deleteLocal(id);
        }
      } else {
        deleteLocal(id);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}
