import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, DollarSign, Clock, AlertTriangle, FileText, CheckCircle, Package, X } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';

const RevenueChart = lazy(() => import('../components/charts/RevenueChart'));
const ContratosOSChart = lazy(() => import('../components/charts/ContratosOSChart'));
const ReceiptsChart = lazy(() => import('../components/charts/ReceiptsChart'));

const CARD_META = {
  totalOS:     { title: 'Total OS',        icon: Wrench,      accent: 'yellow', key: 'allOS',            columns: 'os' },
  osAbertas:   { title: 'OS Abertas',      icon: Clock,       accent: 'blue',   key: 'openOS',           columns: 'os' },
  osConcluidas:{ title: 'OS Concluidas',   icon: CheckCircle, accent: 'green',  key: 'closedOS',         columns: 'os' },
  receita:     { title: 'Receita Mensal',  icon: DollarSign,  accent: 'yellow', key: 'receitaDetalhada',  columns: 'contract' },
  locados:     { title: 'Equip. Locados',  icon: Package,     accent: 'green',  key: 'rentedEquip',      columns: 'equip' },
  disponiveis: { title: 'Equip. Disponiveis', icon: Wrench,   accent: 'blue',   key: 'availableEquip',   columns: 'equip' },
  ativos:      { title: 'Contratos Ativos',   icon: FileText, accent: 'yellow', key: 'activeContracts',  columns: 'contract' },
  vencendo:    { title: 'Contratos Vencendo', icon: AlertTriangle, accent: 'red', key: 'expiringContracts', columns: 'contract' },
};

const osColumns = [
  { key: 'id', header: 'ID', cellClass: 'font-mono font-semibold' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'status', header: 'Status', isBadge: true },
];

const equipColumns = [
  { key: 'id', header: 'ID', cellClass: 'font-mono font-semibold' },
  { key: 'nome', header: 'Nome' },
  { key: 'status', header: 'Status', isBadge: true },
];

const contractColumns = [
  { key: 'numero', header: 'Numero', cellClass: 'font-semibold' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'valorMensal', header: 'Valor Mensal', isMoney: true },
];

const COLUMNS_MAP = { os: osColumns, equip: equipColumns, contract: contractColumns };

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const [modalCard, setModalCard] = useState(null);

  if (isLoading) return <div className="p-6"><TableSkeleton rows={8} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  const { metricas = {}, recentOS = [], alertasContratos = [], detailData = {} } = data || {};
  if (!data) return null;

  const meta = modalCard ? CARD_META[modalCard] : null;
  const modalItems = meta ? (detailData[meta.key] || []) : [];
  const modalColumns = meta ? COLUMNS_MAP[meta.columns] : [];

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'totalOS', value: metricas.totalOS || 0 },
          { id: 'osAbertas', value: metricas.osAbertas || 0 },
          { id: 'osConcluidas', value: metricas.osConcluidas || 0 },
          { id: 'receita', value: `R$ ${(metricas.receitaMensal || 0).toLocaleString('pt-BR')}` },
        ].map(({ id, value }) => (
          <MetricCard key={id} icon={CARD_META[id].icon} title={CARD_META[id].title} value={value}
            accent={CARD_META[id].accent} onClick={() => setModalCard(id)} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'locados', value: metricas.equipamentosLocados || 0 },
          { id: 'disponiveis', value: metricas.equipamentosDisponiveis || 0 },
          { id: 'ativos', value: metricas.contratosAtivos || 0 },
          { id: 'vencendo', value: metricas.contratosVencendo || 0 },
        ].map(({ id, value }) => (
          <MetricCard key={id} icon={CARD_META[id].icon} title={CARD_META[id].title} value={value}
            accent={CARD_META[id].accent} onClick={() => setModalCard(id)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Receita Mensal</h3>
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Carregando grafico...</div>}>
            {metricas.receitaMes && metricas.meses ? (
              <RevenueChart data={metricas.receitaMes.map((v, i) => ({ name: metricas.meses[i], valor: v }))} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Dados de receita indisponiveis</div>
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
                  <AlertTriangle className={`w-4 h-4 ${!c.assinado ? 'text-yellow-500' : c.vencimentoDias != null && c.vencimentoDias <= 0 ? 'text-red-500' : 'text-orange-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.cliente || c.numero || 'S/N'}</p>
                    <p className="text-xs text-gray-500">
                      {!c.assinado ? 'Pendente de assinatura' : c.vencimentoDias != null ? `${c.vencimentoDias} dias restantes` : '-'}
                    </p>
                  </div>
                  <StatusBadge status={!c.assinado ? 'pendente' : c.vencimentoDias != null && c.vencimentoDias <= 0 ? 'vencido' : 'assinado'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Contratos e OS por Mes</h3>
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Carregando grafico...</div>}>
            {data?.chartData ? <ContratosOSChart data={data.chartData} /> : <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Dados indisponiveis</div>}
          </Suspense>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Comprovantes</h3>
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Carregando grafico...</div>}>
            {data?.receiptsData ? <ReceiptsChart data={data.receiptsData} /> : <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Dados indisponiveis</div>}
          </Suspense>
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
                <th className="pb-3 font-medium hidden sm:table-cell">Equipamento</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium hidden md:table-cell">Prioridade</th>
                <th className="pb-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(recentOS || []).map((os) => (
                <tr key={os.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/ordens?expand=${os.id}`)}>
                  <td className="py-3 font-mono text-xs font-semibold" translate="no">{os.id}</td>
                  <td className="py-3 font-medium">{os.cliente || 'S/N'}</td>
                  <td className="py-3 hidden sm:table-cell">{os.equipamento || 'S/N'}</td>
                  <td className="py-3"><StatusBadge status={os.status} /></td>
                  <td className="py-3 hidden md:table-cell"><StatusBadge status={os.prioridade} /></td>
                  <td className="py-3 font-medium" translate="no">R$ {Number(os.valor || 0).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalCard && meta && (
          <motion.div key="dashboard-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalCard(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                    <meta.icon size={16} className="text-yellow-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{meta.title}</h2>
                  <span className="text-sm text-gray-500">({modalItems.length})</span>
                </div>
                <button onClick={() => setModalCard(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {modalItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum registro</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-500">
                        {modalColumns.map((col) => (
                          <th key={col.key} className="px-3 py-2 font-medium text-left text-xs">{col.header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modalItems.map((item, i) => (
                        <tr key={item.id || i} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          {modalColumns.map((col) => (
                            <td key={col.key} className={`px-3 py-2.5 ${col.cellClass || ''}`}>
                              {col.isBadge ? <StatusBadge status={item[col.key]} /> :
                               col.isMoney ? <span className="text-green-600 font-medium">R$ {(item[col.key] || 0).toLocaleString('pt-BR')}</span> :
                               item[col.key] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
