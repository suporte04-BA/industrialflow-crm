import { useState, useEffect } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { Plus, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { db, isConfigured } from '../lib/supabase';
import { contratos as mockContratos } from '../data/mockData';

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'ativo' },
  { label: 'Vencendo', value: 'vencendo' },
  { label: 'Vencidos', value: 'vencido' },
];

export default function Contratos() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(mockContratos);

  useEffect(() => {
    const loadData = async () => {
      if (!isConfigured()) return;
      const { data: ctData } = await db.contratos.list({ status: filter, search });
      if (ctData) setData(ctData);
    };
    loadData();
  }, [filter, search]);

  const filtered = data.filter(c => {
    const matchStatus = filter === 'all' || c.status === filter;
    const matchSearch = !search || c.cliente.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Buscar por cliente ou Nº contrato..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
        <Button onClick={() => toast.success('Novo contrato criado!')} variant="primary">
          <Plus size={16} /> Novo Contrato
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f.value ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {f.label}
            <span className="ml-1.5 opacity-60">{f.value === 'all' ? data.length : data.filter(c => c.status === f.value).length}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ativos', value: data.filter(c => c.status === 'ativo').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Vencendo', value: data.filter(c => c.status === 'vencendo').length, icon: AlertTriangle, color: 'text-yellow-600' },
          { label: 'Vencidos', value: data.filter(c => c.status === 'vencido').length, icon: XCircle, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-shadow hover:shadow-md ${c.status === 'vencido' ? 'border-red-200' : c.status === 'vencendo' ? 'border-yellow-200' : 'border-gray-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${c.status === 'vencido' ? 'bg-red-50' : c.status === 'vencendo' ? 'bg-yellow-50' : 'bg-[#1C1C1C]'}`}>
                  <FileText size={18} className={c.status === 'vencido' ? 'text-red-500' : c.status === 'vencendo' ? 'text-yellow-600' : 'text-yellow-400'} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">{c.id}</span>
                    <StatusBadge status={c.status} />
                    {!c.assinado && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">Aguardando Assinatura</span>}
                  </div>
                  <h3 className="font-bold text-[#1C1C1C] text-sm">{c.cliente}</h3>
                  <p className="text-xs text-gray-400">{c.cnpj}</p>
                  <p className="text-xs text-gray-500 mt-1">{Array.isArray(c.equipamentos) ? c.equipamentos.join(', ') : ''}</p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <p className="text-xl font-bold text-[#1C1C1C]">R$ {(c.valorMensal || 0).toLocaleString('pt-BR')}<span className="text-xs font-normal text-gray-400">/mes</span></p>
                <p className="text-xs text-gray-400">Total: R$ {(c.valorTotal || 0).toLocaleString('pt-BR')}</p>
                <div className="text-xs text-gray-500 mt-1">{c.inicio ? new Date(c.inicio).toLocaleDateString('pt-BR') : '-'} → {c.fim ? new Date(c.fim).toLocaleDateString('pt-BR') : '-'}</div>
                {c.status === 'vencendo' && <p className="text-xs font-semibold text-yellow-700">Vence em {c.vencimentoDias} dias</p>}
                {c.status === 'vencido' && <p className="text-xs font-semibold text-red-600">Venceu ha {Math.abs(c.vencimentoDias)} dias</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <button className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">Ver Detalhes</button>
              {c.status !== 'ativo' && (
                <button className="text-xs px-3 py-1.5 bg-yellow-400 text-[#1C1C1C] rounded-lg font-semibold hover:bg-yellow-300"
                  onClick={() => toast.success('Contrato renovado com sucesso!')}>Renovar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
