import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake } from '../lib/converters';
import { useRealtime } from './useRealtime';

const initialMock = [
  {
    id: 'mock-1', contrato: '2024-00100', locatario: 'Empresa de Teste LTDA',
    data: '10/06/2026', total: 1500.00, status: 'entregue',
    endereco: 'Av. Principal, 500', numero: '500', bairro: 'Centro',
    cidade: 'Sao Paulo', estado: 'SP', fone: '(11) 99999-9999',
    itens: [
      { descricao: 'Betoneira 400L', quantidade: 1, valorUnitario: 1000, patrimonio: '12345' },
      { descricao: 'Andaime 1.80m', quantidade: 5, valorUnitario: 100, patrimonio: '67890' },
    ],
  },
  {
    id: 'mock-2', contrato: '2024-00101', locatario: 'Joao da Silva',
    data: '12/06/2026', total: 450.50, status: 'pendente',
    endereco: 'Rua Secundaria, 123', numero: '123', bairro: 'Jardim',
    cidade: 'Rio de Janeiro', estado: 'RJ', fone: '(21) 88888-8888',
    itens: [
      { descricao: 'Compactador de Solo', quantidade: 1, valorUnitario: 450.50, patrimonio: '11223' },
    ],
  },
];

export function useComprovantes() {
  const queryClient = useQueryClient();
  const queryKey = ['comprovantes'];
  const [localData, setLocalData] = useState(initialMock);
  const [useLocal, setUseLocal] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        setUseLocal(true);
        return localData;
      }
      try {
        const { data, error } = await supabase
          .from('comprovantes_entrega')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUseLocal(false);
        return (data || []).map(toCamel);
      } catch {
        setUseLocal(true);
        return localData;
      }
    },
    staleTime: 5000,
  });

  useRealtime('comprovantes_entrega', queryClient, queryKey);

  return {
    data: useLocal ? localData : (query.data || []),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    _localData: localData,
    _setLocalData: setLocalData,
    _useLocal: useLocal,
  };
}

export function useCreateComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newComp) => {
      const localItem = { id: crypto.randomUUID(), ...newComp, createdAt: new Date().toISOString() };
      if (!isConfigured()) return localItem;
      try {
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
        if (error) throw error;
        return toCamel(data);
      } catch {
        return localItem;
      }
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
      try {
        const payload = toSnake(updates);
        const { data, error } = await supabase.from('comprovantes_entrega').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return toCamel(data);
      } catch {
        return { id, ...updates };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}

export function useDeleteComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!isConfigured()) return;
      try {
        const { error } = await supabase.from('comprovantes_entrega').delete().eq('id', id);
        if (error) throw error;
      } catch {
        // silently fail
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
    },
  });
}
