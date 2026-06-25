import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake, computeVencimentoDias } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';
import { contratos as mockContratos } from '../data/mockData';

const LOCAL_KEY = 'contratos_local';
const COMP_LOCAL_KEY = 'comprovantes_local';

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

function getCompLocal() {
  return JSON.parse(localStorage.getItem(COMP_LOCAL_KEY) || '[]');
}

function saveCompLocal(item) {
  const stored = getCompLocal();
  stored.unshift(item);
  localStorage.setItem(COMP_LOCAL_KEY, JSON.stringify(stored));
}

function formatDateTime(date) {
  const d = date || new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatTime(date) {
  const d = date || new Date();
  return d.toTimeString().slice(0, 5);
}

export function useContratos(filters = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['contratos', filters];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isConfigured()) {
        const local = getLocal();
        return local.length > 0 ? local : mockContratos;
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
  const emailRecipient = '';
  return useMutation({
    mutationFn: async (newCt) => {
      const now = new Date();
      let maxNum = 0;

      if (isConfigured()) {
        try {
          const { data } = await supabase.from('contratos').select('id');
          if (data) {
            maxNum = Math.max(...data.map(c => parseInt((c.id || '').replace('CT-', '')) || 0), 0);
          }
        } catch { /* fallback to local */ }
      }

      if (maxNum === 0) {
        const localItems = getLocal();
        maxNum = Math.max(
          ...localItems.map(c => parseInt(c.id.replace('CT-', '')) || 0),
          ...mockContratos.map(c => parseInt(c.id.replace('CT-', '')) || 0),
          0
        );
      }

      const newId = `CT-${String(maxNum + 1).padStart(3, '0')}`;

      const item = {
        id: newId,
        cliente: newCt.cliente,
        cnpj: newCt.cnpj,
        rg: newCt.rg || '',
        equipamentos: newCt.equipamentos || [],
        numero: newCt.numero || '',
        dataContrato: newCt.dataContrato || formatDateTime(now),
        horaContrato: newCt.horaContrato || formatTime(now),
        atendente: newCt.atendente || '',
        inicio: newCt.inicio,
        fim: newCt.fim,
        valorTotal: newCt.valorTotal || 0,
        valorMensal: newCt.valorMensal || 0,
        status: newCt.status || 'ativo',
        assinado: newCt.assinado || false,
        endereco: newCt.endereco || '',
        numeroEndereco: newCt.numeroEndereco || '',
        bairro: newCt.bairro || '',
        cidade: newCt.cidade || '',
        estado: newCt.estado || '',
        cep: newCt.cep || '',
        telefone: newCt.telefone || '',
        email: newCt.email || '',
        contato: newCt.contato || '',
        localEntrega: newCt.localEntrega || '',
        telefoneEntrega: newCt.telefoneEntrega || '',
        itens: newCt.itens || [],
        observacao: newCt.observacao || '',
        createdAt: now.toISOString(),
      };

      if (isConfigured()) {
        const payload = toSnake({
          cliente: newCt.cliente,
          cnpj: newCt.cnpj,
          rg: newCt.rg || '',
          equipamentos: newCt.equipamentos || [],
          numero: newCt.numero || '',
          dataContrato: newCt.dataContrato || formatDateTime(now),
          horaContrato: newCt.horaContrato || formatTime(now),
          atendente: newCt.atendente || '',
          inicio: newCt.inicio,
          fim: newCt.fim,
          valorTotal: newCt.valorTotal || 0,
          valorMensal: newCt.valorMensal || 0,
          status: newCt.status || 'ativo',
          assinado: newCt.assinado || false,
          endereco: newCt.endereco || '',
          numeroEndereco: newCt.numeroEndereco || '',
          bairro: newCt.bairro || '',
          cidade: newCt.cidade || '',
          estado: newCt.estado || '',
          cep: newCt.cep || '',
          telefone: newCt.telefone || '',
          email: newCt.email || '',
          contato: newCt.contato || '',
          localEntrega: newCt.localEntrega || '',
          telefoneEntrega: newCt.telefoneEntrega || '',
          itens: newCt.itens || [],
          observacao: newCt.observacao || '',
        });
        const { data, error } = await supabase.from('contratos').insert(payload).select().single();
        if (error) throw handleSupabaseError(error);

        const ctSaved = toCamel(data);

        const compPayload = toSnake({
          contratoId: ctSaved.id,
          contrato: ctSaved.id,
          atendente: ctSaved.atendente || '',
          data: ctSaved.dataContrato || formatDateTime(now),
          hora: ctSaved.horaContrato || formatTime(now),
          locatario: ctSaved.cliente,
          cpf: ctSaved.cnpj,
          rg: ctSaved.rg || '',
          telefone: ctSaved.telefone,
          contato: ctSaved.contato,
          endereco: ctSaved.endereco,
          numero: ctSaved.numeroEndereco,
          bairro: ctSaved.bairro,
          cidade: ctSaved.cidade,
          estado: ctSaved.estado,
          cep: ctSaved.cep,
          localEntrega: ctSaved.localEntrega,
          telefoneEntrega: ctSaved.telefoneEntrega,
          itens: ctSaved.itens || [],
          total: ctSaved.valorTotal || 0,
          observacao: ctSaved.observacao,
          status: 'pendente',
          assinado: false,
          tipoDocumento: newCt.tipoDocumento || 'entrega',
          condicoesDevolucao: newCt.condicoesDevolucao || null,
        });
        try {
          const { data: compData, error: compErr } = await supabase.from('comprovantes_entrega').insert(compPayload).select().single();
          if (compErr) console.error('Erro ao criar comprovante:', compErr);
          else {
            try {
              await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo: 'contrato_criado',
                  contrato_id: ctSaved.id,
                  comprovante_id: compData.id,
                  destinatario: emailRecipient,
                  contrato: {
                    id: ctSaved.id, numero: ctSaved.numero, cliente: ctSaved.cliente, cnpj: ctSaved.cnpj, rg: ctSaved.rg,
                    equipamentos: ctSaved.equipamentos, inicio: ctSaved.inicio, fim: ctSaved.fim,
                    valorMensal: ctSaved.valorMensal, valorTotal: ctSaved.valorTotal,
                    atendente: ctSaved.atendente, localEntrega: ctSaved.localEntrega,
                    endereco: ctSaved.endereco, numero_endereco: ctSaved.numeroEndereco, bairro: ctSaved.bairro,
                    cidade: ctSaved.cidade, estado: ctSaved.estado, cep: ctSaved.cep,
                    telefone: ctSaved.telefone, email: ctSaved.email, contato: ctSaved.contato,
                  },
                  comprovante: {
                    id: compData.id, locatario: ctSaved.cliente, cpf: ctSaved.cnpj, rg: ctSaved.rg,
                    endereco: ctSaved.endereco, cidade: ctSaved.cidade, total: ctSaved.valorTotal,
                    itens: ctSaved.itens, localEntrega: ctSaved.localEntrega,
                  },
                }),
              });
            } catch { /* email non-blocking */ }
          }
        } catch (e) {
          console.error('Falha ao criar comprovante:', e);
        }

        return ctSaved;
      }

      saveToLocal(item);

      const compId = crypto.randomUUID();
      const comp = {
        id: compId,
        contratoId: item.id,
        contrato: item.id,
        atendente: item.atendente || '',
        data: item.dataContrato || formatDateTime(now),
        hora: item.horaContrato || formatTime(now),
        locatario: item.cliente,
        cpf: item.cnpj,
        rg: item.rg || '',
        telefone: item.telefone,
        contato: item.contato,
        endereco: item.endereco,
        numero: item.numeroEndereco,
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado,
        cep: item.cep,
        localEntrega: item.localEntrega,
        telefoneEntrega: item.telefoneEntrega,
        itens: item.itens || [],
        total: item.valorTotal || 0,
        observacao: item.observacao,
        status: 'pendente',
        assinado: false,
        tipoDocumento: newCt.tipoDocumento || 'entrega',
        condicoesDevolucao: newCt.condicoesDevolucao || null,
        createdAt: now.toISOString(),
      };
      saveCompLocal(comp);

      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'contrato_criado',
            contrato_id: item.id,
            contrato: {
              id: item.id, numero: item.numero, cliente: item.cliente, cnpj: item.cnpj, rg: item.rg,
              equipamentos: item.equipamentos, inicio: item.inicio, fim: item.fim,
              valorMensal: item.valorMensal, valorTotal: item.valorTotal,
              atendente: item.atendente, localEntrega: item.localEntrega,
              endereco: item.endereco, numero_endereco: item.numeroEndereco, bairro: item.bairro,
            },
            comprovante: {
              id: comp.id, locatario: item.cliente, cpf: item.cnpj, rg: item.rg,
              endereco: item.endereco, cidade: item.cidade, total: item.valorTotal,
            },
          }),
        });
      } catch { /* email non-blocking */ }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
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
