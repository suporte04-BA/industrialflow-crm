import { lazy, Suspense } from 'react';
import { Wrench, DollarSign, Clock, AlertTriangle, FileText, CheckCircle, Package } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';

const RevenueChart = lazy(() => import('../components/charts/RevenueChart'));

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) return <div className="p-6"><TableSkeleton rows={8} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  const { metricas = {}, recentOS = [], alertasContratos = [] } = data || {};
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Wrench} title="Total OS" value={metricas.totalOS || 0} accent="yellow" />
        <MetricCard icon={Clock} title="OS Abertas" value={metricas.osAbertas || 0} accent="blue" />
        <MetricCard icon={CheckCircle} title="OS Concluidas" value={metricas.osConcluidas || 0} accent="green" />
        <MetricCard icon={DollarSign} title="Receita Mensal" value={`R$ ${(metricas.receitaMensal || 0).toLocaleString('pt-BR')}`} accent="yellow" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Package} title="Equip. Locados" value={metricas.equipamentosLocados} accent="green" />
        <MetricCard icon={Wrench} title="Equip. Disponiveis" value={metricas.equipamentosDisponiveis} accent="blue" />
        <MetricCard icon={FileText} title="Contratos Ativos" value={metricas.contratosAtivos} accent="yellow" />
        <MetricCard icon={AlertTriangle} title="Contratos Vencendo" value={metricas.contratosVencendo} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Receita Mensal</h3>
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Carregando grafico...</div>}>
            {metricas.receitaMes && metricas.meses ? (
              <RevenueChart data={metricas.receitaMes.map((v, i) => ({ name: metricas.meses[i], valor: v }))} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                Dados de receita indisponíveis
              </div>
            )}
          </Suspense>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Alertas</h3>
          {(alertasContratos || []).length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum alerta no momento.</p>
          ) : (
            <div className="space-y-3">
              {(alertasContratos || []).slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className={`w-4 h-4 ${c.status === 'vencido' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.cliente || 'S/N'}</p>
                    <p className="text-xs text-gray-500">{c.id} - {c.vencimentoDias != null ? `${c.vencimentoDias} dias` : '-'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">OS Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Equipamento</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Prioridade</th>
                <th className="pb-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(recentOS || []).map((os) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-mono text-xs font-semibold">{os.id}</td>
                  <td className="py-3">{os.cliente || 'S/N'}</td>
                  <td className="py-3">{os.equipamento || 'S/N'}</td>
                  <td className="py-3"><StatusBadge status={os.status} /></td>
                  <td className="py-3"><StatusBadge status={os.prioridade} /></td>
                  <td className="py-3 font-medium">R$ {Number(os.valor || 0).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
