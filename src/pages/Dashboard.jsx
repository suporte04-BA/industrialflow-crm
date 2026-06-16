import { useState, useEffect } from 'react';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import { ClipboardList, Package, FileText, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { db, isConfigured } from '../lib/supabase';
import { ordensServico as mockOS, contratos as mockContratos, metricas as mockMetricas } from '../data/mockData';

export default function Dashboard() {
  const [ordens, setOrdens] = useState(mockOS);
  const [contratos, setContratos] = useState(mockContratos);
  const [metricas, setMetricas] = useState(mockMetricas);

  useEffect(() => {
    const loadData = async () => {
      if (!isConfigured()) return;
      const { data: osData } = await db.ordensServico.list();
      const { data: ctData } = await db.contratos.list();
      if (osData) setOrdens(osData);
      if (ctData) setContratos(ctData);
    };
    loadData();
  }, []);

  const chartData = metricas.meses.map((m, i) => ({ mes: m, receita: metricas.receitaMes[i] }));
  const osRecentes = ordens.slice(0, 5);
  const contratosAlerta = contratos.filter(c => c.status === 'vencendo' || c.status === 'vencido');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="OS Abertas" value={metricas.osAbertas} subtitle="2 urgentes" icon={ClipboardList} accent />
        <MetricCard title="Equipamentos Locados" value={metricas.equipamentosLocados} subtitle={`${metricas.equipamentosDisponiveis} disponiveis`} icon={Package} />
        <MetricCard title="Contratos Ativos" value={metricas.contratosAtivos} subtitle={`${metricas.contratosVencendo} vencendo`} icon={FileText} />
        <MetricCard title="Receita Mensal" value={`R$ ${metricas.receitaMensal.toLocaleString('pt-BR')}`} subtitle="Locacoes ativas" icon={DollarSign} trend={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-bold text-[#1C1C1C] text-base">Receita de Locacoes</h2>
            <p className="text-xs text-gray-500">Ultimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }} />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length - 1 ? '#FFC107' : '#E5E5E5'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-[#1C1C1C] text-base mb-4">Alertas</h2>
          <div className="space-y-3">
            {contratosAlerta.map(c => (
              <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg ${c.status === 'vencido' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                <AlertTriangle size={15} className={c.status === 'vencido' ? 'text-red-500 mt-0.5' : 'text-yellow-600 mt-0.5'} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{c.cliente}</p>
                  <p className="text-xs text-gray-500">{c.status === 'vencido' ? `Venceu ha ${Math.abs(c.vencimentoDias)} dias` : `Vence em ${c.vencimentoDias} dias`}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
              <CheckCircle size={15} className="text-green-500 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-800">2 OS concluidas hoje</p>
                <p className="text-xs text-gray-500">Trator e Empilhadeira revisados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1C1C1C] text-base">Ordens de Servico Recentes</h2>
          <Link to="/ordens" className="text-xs text-yellow-600 font-semibold hover:underline">Ver todas →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F5F5]">
                {['OS', 'Cliente', 'Equipamento', 'Tecnico', 'Status', 'Prioridade'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {osRecentes.map(os => (
                <tr key={os.id} className="border-t border-gray-100 hover:bg-yellow-400/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{os.id}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{os.cliente}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{os.equipamento}</td>
                  <td className="px-4 py-3 text-gray-600">{os.tecnico}</td>
                  <td className="px-4 py-3"><StatusBadge status={os.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={os.prioridade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
