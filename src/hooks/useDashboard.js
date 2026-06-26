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

      const { data, error } = await supabase.from('dashboard').select('*').single(); 
      // Wait, dashboard is not a table, it's a worker route!
      // I must use the worker route /api/dashboard
      
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return await response.json();
    },
    staleTime: 60000,
  });
}
