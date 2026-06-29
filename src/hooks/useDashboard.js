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
        const [osRes, eqRes, ctRes] = await Promise.all([
          supabase.from('ordens_servico').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('equipamentos').select('*'),
          supabase.from('contratos').select('*'),
        ]);
        const osData = (osRes.data || []).map(toCamel);
        const eqData = (eqRes.data || []).map(toCamel);
        const ctData = (ctRes.data || []).map(toCamel);
        const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const hoje = new Date();
        const receitaMes = mesesNomes.map((_, i) => {
          return ctData.filter(c => {
            if (c.status !== 'ativo') return false;
            const inicio = new Date(c.inicio || c.dataContrato || hoje);
            const fim = new Date(c.fim || hoje);
            return inicio.getMonth() <= i && fim.getMonth() >= i && inicio.getFullYear() <= hoje.getFullYear();
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
            contratosAtivos: ctData.filter(c => c.status === 'ativo').length,
            contratosVencendo: ctData.filter(c => c.status === 'vencendo').length,
            contratosVencidos: ctData.filter(c => c.status === 'vencido').length,
            receitaMensal: ctData.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.valorMensal || 0), 0),
            receitaMes,
            meses: mesesNomes,
          },
          recentOS: osData.slice(0, 5),
          alertasContratos: ctData
            .filter(c => c.status === 'vencendo' || c.status === 'vencido' || !c.assinado)
            .map(c => ({
              ...c,
              vencimentoDias: c.fim ? Math.ceil((new Date(c.fim) - hoje) / (1000 * 60 * 60 * 24)) : null,
            })),
        };
      }
    },
    staleTime: 60000,
    retry: 1,
  });
}