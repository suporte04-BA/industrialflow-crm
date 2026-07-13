import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, toSnake, computeVencimentoDias } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
import { useRealtime } from './useRealtime';
import { contratos as mockContratos } from '../data/mockData';

const LOCAL_KEY = 'contratos_local';
const COMP_LOCAL_KEY = 'comprovantes_local';

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
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
  try { return JSON.parse(localStorage.getItem(COMP_LOCAL_KEY) || '[]'); } catch { return []; }
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
      const now = new Date();
      let maxNum = 0;

      if (isConfigured()) {
        const cached = queryClient.getQueryData(['contratos']);
        if (cached && cached.length > 0) {
          const nums = cached.map(c => parseInt((c.id || '').replace('CT-', ''), 10) || 0);
          maxNum = Math.max(...nums, 0);
        } else {
          try {
            const { data } = await supabase.from('contratos').select('id').order('id', { ascending: false }).limit(1);
            if (data && data.length > 0) {
              maxNum = parseInt((data[0].id || '').replace('CT-', ''), 10) || 0;
            }
          } catch { /* fallback to local */ }
        }
      }

      if (maxNum === 0) {
        const localItems = getLocal();
        const localNums = localItems.map(c => parseInt((c.id || '').replace('CT-', ''), 0));
        const mockNums = mockContratos.map(c => parseInt((c.id || '').replace('CT-', ''), 0));
        maxNum = Math.max(...localNums, ...mockNums, 0);
      }

      const newId = `CT-${String(maxNum + 1).padStart(3, '0')}`;

      const item = {
        id: newId,
        cliente: newCt.cliente,
        cnpj: newCt.cnpj,
        equipamentos: newCt.equipamentos || [],
        numero: newCt.numero || '',
        dataContrato: newCt.dataContrato || formatDateTime(now),
        horaContrato: newCt.horaContrato || formatTime(now),
        atendente: newCt.atendente || '',
        referencia: newCt.referencia || '',
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
        contato: newCt.contato || '',
        rg: newCt.rg || '',
        telefone: newCt.telefone || '',
        localEntrega: newCt.localEntrega || '',
        telefoneEntrega: newCt.telefoneEntrega || '',
        itens: newCt.itens || [],
        observacao: newCt.observacao || '',
        tipoDocumento: newCt.tipoDocumento || 'entrega',
        condicoesDevolucao: newCt.condicoesDevolucao || null,
        createdAt: now.toISOString(),
      };

      if (isConfigured()) {
        // 1. Optimistic update: UI sees the contract instantly
        queryClient.setQueryData(['contratos'], (old = []) => [item, ...old]);

        const payload = toSnake({
          cliente: newCt.cliente,
          cnpj: newCt.cnpj,
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
          contato: newCt.contato || '',
          rg: newCt.rg || '',
          telefone: newCt.telefone || '',
          localEntrega: newCt.localEntrega || '',
          telefoneEntrega: newCt.telefoneEntrega || '',
          itens: newCt.itens || [],
          observacao: newCt.observacao || '',
        });

        // 2. Background: insert contract in Supabase (non-blocking, with rollback on failure)
        supabase.from('contratos').insert(payload).select().single().then(({ data: insertedCt, error: ctError }) => {
          if (ctError) {
            console.error('[contrato] Insert failed:', ctError);
            queryClient.setQueryData(['contratos'], (old = []) => old.filter(c => c.id !== item.id));
            return;
          }
          // Update optimistic cache with real server data (e.g. server-generated defaults)
          const ctSaved = toCamel(insertedCt);
          queryClient.setQueryData(['contratos'], (old = []) => old.map(c => c.id === item.id ? ctSaved : c));

          // === SECONDARY: comprovante, OS, equipamentos, email ===
          const retryOp = async (fn, name, retries = 3) => {
            for (let i = 0; i <= retries; i++) {
              try { return await fn(); } catch (e) {
                console.error(`[contrato ${name}] attempt ${i + 1} failed:`, e.message);
                if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
              }
            }
          };

          const compPayload = toSnake({
            contratoId: ctSaved.id, contrato: ctSaved.id,
            atendente: ctSaved.atendente || '',
            data: ctSaved.dataContrato || formatDateTime(now),
            hora: ctSaved.horaContrato || formatTime(now),
            locatario: ctSaved.cliente, cpf: ctSaved.cnpj, contato: ctSaved.contato,
            rg: ctSaved.rg || '', telefone: ctSaved.telefone || '',
            endereco: ctSaved.endereco, numero: ctSaved.numeroEndereco, bairro: ctSaved.bairro,
            cidade: ctSaved.cidade, estado: ctSaved.estado, cep: ctSaved.cep,
            localEntrega: ctSaved.localEntrega, telefoneEntrega: ctSaved.telefoneEntrega,
            itens: ctSaved.itens || [], total: ctSaved.valorTotal || 0,
            observacao: ctSaved.observacao, status: 'pendente', assinado: false,
          });

          retryOp(() => supabase.from('comprovantes_entrega').insert(compPayload), 'comprovante').then(() => {
            queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
            const emailTipo = newCt.tipoDocumento === 'devolucao' ? 'devolucao_registrada' : 'contrato_criado';
            const contratoEmail = { id: ctSaved.id, numero: ctSaved.numero, cliente: ctSaved.cliente, cnpj: ctSaved.cnpj, rg: ctSaved.rg || '', telefone: ctSaved.telefone || '', equipamentos: ctSaved.equipamentos, inicio: ctSaved.inicio, fim: ctSaved.fim, valorMensal: ctSaved.valorMensal, valorTotal: ctSaved.valorTotal, atendente: ctSaved.atendente, localEntrega: ctSaved.localEntrega, endereco: ctSaved.endereco, numero_endereco: ctSaved.numeroEndereco, bairro: ctSaved.bairro, cidade: ctSaved.cidade, estado: ctSaved.estado, cep: ctSaved.cep, contato: ctSaved.contato };
            const comprovanteEmail = { id: null, locatario: ctSaved.cliente, cpf: ctSaved.cnpj, rg: ctSaved.rg || '', telefone: ctSaved.telefone || '', endereco: ctSaved.endereco, cidade: ctSaved.cidade, total: ctSaved.valorTotal, itens: ctSaved.itens, localEntrega: ctSaved.localEntrega };
            const emailBody = newCt.tipoDocumento === 'devolucao'
              ? { tipo: emailTipo, contrato_id: ctSaved.id, comprovante_id: null, destinatario: '', contrato: contratoEmail, comprovante: comprovanteEmail, devolucao: { numero: ctSaved.numero || ctSaved.id, contratoId: ctSaved.id, locatario: ctSaved.cliente, data: ctSaved.dataContrato, hora: ctSaved.horaContrato, localObra: ctSaved.localEntrega || ctSaved.endereco, telefone: ctSaved.telefoneEntrega || ctSaved.telefone, cidade: ctSaved.cidade, estado: ctSaved.estado, itens: ctSaved.itens || [], condicoes: ctSaved.condicoesDevolucao || {} } }
              : { tipo: emailTipo, contrato_id: ctSaved.id, comprovante_id: null, destinatario: '', contrato: contratoEmail, comprovante: comprovanteEmail };
            fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailBody) }).catch(() => {});
          }).catch(() => {});

          const osTipo = newCt.tipoDocumento === 'devolucao' ? 'devolucao' : 'entrega';
          retryOp(() => supabase.from('ordens_servico').insert(toSnake({ cliente: ctSaved.cliente, equipamento: (ctSaved.equipamentos || []).join(', ') || '-', tipo: osTipo, status: 'pendente', prioridade: 'normal', tecnico: ctSaved.atendente || '', abertura: ctSaved.dataContrato || new Date().toISOString().split('T')[0], previsao: ctSaved.fim || null, valor: ctSaved.valorTotal || 0, observacoes: `Contrato ${ctSaved.id} - ${osTipo} automatica` })), 'os').then(() => {
            queryClient.invalidateQueries({ queryKey: ['ordensServico'] });
          }).catch(() => {});

          retryOp(async () => {
            const equipNames = (ctSaved.equipamentos || []).filter(e => e && e.trim());
            if (equipNames.length === 0) return;
            const { data: existing } = await supabase.from('equipamentos').select('nome');
            const existingNames = new Set((existing || []).map(e => (e.nome || '').toLowerCase()));
            const itens = Array.isArray(ctSaved.itens) ? ctSaved.itens : [];
            const newEquips = equipNames.filter(name => !existingNames.has(name.toLowerCase().trim())).map(name => {
              const matchedItem = itens.find(it => (it.descricao || '').toLowerCase().trim() === name.toLowerCase().trim());
              return {
                nome: name.trim(),
                categoria: 'Geral',
                status: 'locado',
                patrimonio: matchedItem?.patrimonio || '',
                contrato: ctSaved.id,
                cliente: ctSaved.cliente,
                locacao_inicio: ctSaved.inicio || '',
                locacao_fim: ctSaved.fim || '',
                valor_mensal: matchedItem?.valorUnitario || 0,
              };
            });
            if (newEquips.length > 0) {
              const { error: insertErr } = await supabase.from('equipamentos').insert(newEquips);
              if (insertErr) {
                console.warn('[equipamentos] Insert with all fields failed, retrying without patrimonio:', insertErr.message);
                const fallback = newEquips.map(({ patrimonio, ...rest }) => rest);
                const { error: fallbackErr } = await supabase.from('equipamentos').insert(fallback);
                if (fallbackErr) console.error('[equipamentos] Fallback insert also failed:', fallbackErr.message);
              }
            }
          }, 'equipamentos').then(() => {
            queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
          }).catch(() => {});
        }).catch((e) => {
          console.error('[contrato] Network error:', e);
          queryClient.setQueryData(['contratos'], (old = []) => old.filter(c => c.id !== item.id));
        });

        // 3. Return instantly — UI is already updated via optimistic update
        return item;
      } else {
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
          telefone: item.telefone || '',
          contato: item.contato,
          endereco: item.endereco,
          numero: item.numeroEndereco,
          bairro: item.bairro,
          cidade: item.cidade,
          estado: item.estado,
          cep: item.cep,
          localEntrega: item.localEntrega,
          telefoneEntrega: item.telefoneEntrega,
          referencia: item.referencia || '',
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

        const localEqKey = 'equipamentos_local';
        try {
          const eqLocal = JSON.parse(localStorage.getItem(localEqKey) || '[]');
          const equipNames = (item.equipamentos || []).filter(e => e && e.trim());
          const itens = Array.isArray(item.itens) ? item.itens : [];
          const existingNames = new Set(eqLocal.map(e => (e.nome || '').toLowerCase()));
          const newEquips = equipNames.filter(name => !existingNames.has(name.toLowerCase().trim())).map(name => {
            const matchedItem = itens.find(it => (it.descricao || '').toLowerCase().trim() === name.toLowerCase().trim());
            return {
              id: `EQ-${String(Date.now()).slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
              nome: name.trim(),
              categoria: 'Geral',
              status: 'locado',
              patrimonio: matchedItem?.patrimonio || '',
              contrato: item.id,
              cliente: item.cliente,
              locacaoInicio: item.inicio || '',
              locacaoFim: item.fim || '',
              valorMensal: matchedItem?.valorUnitario || 0,
              horasUso: 0,
              ultimaRevisao: '',
              createdAt: new Date().toISOString(),
            };
          });
          if (newEquips.length > 0) {
            localStorage.setItem(localEqKey, JSON.stringify([...newEquips, ...eqLocal]));
          }
        } catch { /* ignore */ }

        fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'contrato_criado', contrato_id: item.id,
            contrato: { id: item.id, numero: item.numero, cliente: item.cliente, cnpj: item.cnpj, rg: item.rg || '', telefone: item.telefone || '', equipamentos: item.equipamentos, inicio: item.inicio, fim: item.fim, valorMensal: item.valorMensal, valorTotal: item.valorTotal, atendente: item.atendente, localEntrega: item.localEntrega, endereco: item.endereco, numero_endereco: item.numeroEndereco, bairro: item.bairro, cidade: item.cidade, estado: item.estado, cep: item.cep, contato: item.contato },
            comprovante: { id: comp.id, locatario: item.cliente, cpf: item.cnpj, rg: item.rg || '', telefone: item.telefone || '', endereco: item.endereco, cidade: item.cidade, total: item.valorTotal, itens: item.itens, localEntrega: item.localEntrega },
          }),
        }).catch(() => {});

        return item;
      }
    },
    onSettled: () => {
      // Delay invalidation to let optimistic update settle
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['contratos'] });
        queryClient.invalidateQueries({ queryKey: ['comprovantes'] });
        queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
        queryClient.invalidateQueries({ queryKey: ['ordensServico'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 3000);
    },
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (isConfigured()) {
        const { ...validUpdates } = updates;
        const payload = toSnake(validUpdates);
        const { data, error } = await supabase.from('contratos').update(payload).eq('id', id).select().single();
        if (error) throw handleSupabaseError(error);
        return toCamel(data);
      }
      updateLocal(id, updates);
      return { id, ...updates };
    },
    onSettled: () => {
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
