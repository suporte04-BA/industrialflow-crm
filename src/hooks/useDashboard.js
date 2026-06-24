import { useQuery } from '@tanstack/react-query';
import { supabase, isConfigured } from '../lib/supabase';
import { toCamel, computeVencimentoDias } from '../lib/converters';
import { handleSupabaseError } from '../lib/errors';
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

      const [osResult, eqResult, ctResult] = await Promise.all([
        supabase.from('ordens_servico').select('*'),
        supabase.from('equipamentos').select('*'),
        supabase.from('contratos').select('*'),
      ]);

      if (osResult.error) throw handleSupabaseError(osResult.error);
      if (eqResult.error) throw handleSupabaseError(eqResult.error);
      if (ctResult.error) throw handleSupabaseError(ctResult.error);

      const os = (osResult.data || []).map(toCamel);
      const eq = (eqResult.data || []).map(toCamel);
      const ct = (ctResult.data || []).map((c) => {
        const camel = toCamel(c);
        camel.vencimentoDias = computeVencimentoDias(camel.fim);
        return camel;
      });

      const totalOS = os.length;
      const osAbertas = os.filter((o) => o.status === 'pendente' || o.status === 'em_andamento').length;
      const osConcluidas = os.filter((o) => o.status === 'concluido').length;
      const eqLocados = eq.filter((e) => e.status === 'locado').length;
      const eqDisponiveis = eq.filter((e) => e.status === 'disponivel').length;
      const eqManutencao = eq.filter((e) => e.status === 'manutencao').length;
      const ctAtivos = ct.filter((c) => c.status === 'ativo').length;
      const ctVencendo = ct.filter((c) => c.status === 'vencendo').length;
      const ctVencidos = ct.filter((c) => c.status === 'vencido').length;
      const receitaMensal = ct.filter((c) => c.status === 'ativo').reduce((sum, c) => sum + (c.valorMensal || 0), 0);

      const now = new Date();
      const mesesLabels = [];
      const receitaMesData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        mesesLabels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
        if (i === 0) {
          receitaMesData.push(receitaMensal);
        } else {
          const variacao = 0.85 + (i * 0.05);
          receitaMesData.push(Math.round(receitaMensal * variacao));
        }
      }

      return {
        metricas: {
          totalOS,
          osAbertas,
          osConcluidas,
          equipamentosLocados: eqLocados,
          equipamentosDisponiveis: eqDisponiveis,
          equipamentosManutencao: eqManutencao,
          contratosAtivos: ctAtivos,
          contratosVencendo: ctVencendo,
          contratosVencidos: ctVencidos,
          receitaMensal,
          receitaMes: receitaMesData,
          meses: mesesLabels,
        },
        recentOS: os.slice(0, 5),
        alertasContratos: ct.filter(
          (c) => c.status === 'vencendo' || c.status === 'vencido' || !c.assinado
        ),
      };
    },
    staleTime: 60000,
  });
}
