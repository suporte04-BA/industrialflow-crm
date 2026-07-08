import { useQuery } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel } from '../lib/converters';
import { metricas as mockMetricas, ordensServico as mockOS, contratos as mockContratos } from '../data/mockData';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!isConfigured()) {
        return {
          metricas: mockMetricas,
          recentOS: mockOS.slice(0, 5),
          alertasContratos: mockContratos.filter(
            (c) => c.status === 'vencendo' || c.status === 'vencido' || !c.assinado
          ),
        };
      }

      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error('API failed');
        return await response.json();
      } catch {
        const [osRes, eqRes, ctRes, compRes, devRes] = await Promise.all([
          supabase.from('ordens_servico').select('id, status, created_at, cliente, equipamento, valor, prioridade').order('created_at', { ascending: false }).limit(200),
          supabase.from('equipamentos').select('id, status'),
          supabase.from('contratos').select('id, numero, cliente, status, inicio, fim, valor_mensal, assinado'),
          supabase.from('comprovantes_entrega').select('id, created_at, assinado, status').limit(200),
          supabase.from('devolucoes').select('id, created_at').limit(200),
        ]);
        const osData = (osRes.data || []).map(toCamel);
        const eqData = (eqRes.data || []).map(toCamel);
        const ctData = (ctRes.data || []).map(toCamel);
        const compData = (compRes.data || []).map(toCamel);
        const devData = (devRes.data || []).map(toCamel);
        const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const hoje = new Date();
        const receitaMes = mesesNomes.map((_, i) => {
          return ctData.filter(c => {
            if (c.status === 'cancelado' || c.status === 'devolvido') return false;
            const inicio = new Date(c.inicio || c.dataContrato || hoje);
            const fim = new Date(c.fim || hoje);
            const mesInicio = inicio.getFullYear() * 12 + inicio.getMonth();
            const mesFim = fim.getFullYear() * 12 + fim.getMonth();
            const mesAtual = hoje.getFullYear() * 12 + i;
            return mesInicio <= mesAtual && mesFim >= mesAtual;
          }).reduce((s, c) => s + (c.valorMensal || 0), 0);
        });
        return {
          metricas: {
            totalOS: osData.length,
            osAbertas: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length,
            osConcluidas: osData.filter(o => o.status === 'concluido').length,
            equipamentosLocados: eqData.filter(e => e.status === 'locado').length,
            equipamentosDisponiveis: eqData.filter(e => e.status === 'disponivel').length,
            equipamentosManutencao: eqData.filter(e => e.status === 'manutencao').length,
            contratosAtivos: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').length,
            contratosVencendo: ctData.filter(c => {
              if (c.status === 'cancelado' || c.status === 'devolvido') return false;
              if (!c.fim) return false;
              const diasRestantes = Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24));
              return diasRestantes > 0 && diasRestantes <= 30;
            }).length,
            contratosVencidos: ctData.filter(c => {
              if (c.status === 'cancelado' || c.status === 'devolvido') return false;
              if (!c.fim) return false;
              return new Date(c.fim) < hoje;
            }).length,
            receitaMensal: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').reduce((s, c) => s + (c.valorMensal || 0), 0),
            receitaMes,
            meses: mesesNomes,
          },
          recentOS: osData.slice(0, 5),
          alertasContratos: ctData
            .filter(c => {
              if (c.status === 'cancelado' || c.status === 'devolvido') return false;
              if (!c.assinado) return true;
              if (!c.fim) return false;
              const diasRestantes = Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24));
              return diasRestantes <= 30;
            })
            .map(c => ({
              ...c,
              vencimentoDias: c.fim ? Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24)) : null,
            })),
          chartData: {
            meses: mesesNomes,
            contratosPorMes: mesesNomes.map((_, i) => {
              return ctData.filter(c => {
                if (!c.inicio) return false;
                const d = new Date(c.inicio);
                return d.getMonth() === i;
              }).length;
            }),
            osPorMes: mesesNomes.map((_, i) => {
              return osData.filter(o => {
                const dateStr = o.createdAt || o.created_at;
                if (!dateStr) return false;
                const d = new Date(dateStr);
                return d.getMonth() === i;
              }).length;
            }),
          },
          receiptsData: [
            { name: 'Entregas', value: compData.length, color: '#EAB308' },
            { name: 'Devolucoes', value: devData.length, color: '#111827' },
          ],
          detailData: {
            allOS: osData.slice(0, 30),
            openOS: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').slice(0, 20),
            closedOS: osData.filter(o => o.status === 'concluido').slice(0, 20),
            rentedEquip: eqData.filter(e => e.status === 'locado').slice(0, 20),
            availableEquip: eqData.filter(e => e.status === 'disponivel').slice(0, 20),
            activeContracts: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').slice(0, 20),
            expiringContracts: ctData.filter(c => {
              if (c.status === 'cancelado' || c.status === 'devolvido') return false;
              if (!c.fim) return false;
              const diasRestantes = Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24));
              return diasRestantes > 0 && diasRestantes <= 30;
            }).slice(0, 20),
            receitaDetalhada: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').map(c => ({
              numero: c.numero, cliente: c.cliente, valorMensal: c.valorMensal
            })).slice(0, 20),
          },
        };
      }
    },
    staleTime: 60000,
    retry: 1,
  });
}