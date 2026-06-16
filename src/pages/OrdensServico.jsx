import { useState, useEffect } from 'react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import OSDetailModal from '../components/os/OSDetailModal';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { db, isConfigured } from '../lib/supabase';
import { ordensServico as mockOS } from '../data/mockData';

const statusFilters = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Em Andamento', value: 'em_andamento' },
  { label: 'Concluido', value: 'concluido' },
  { label: 'Cancelado', value: 'cancelado' },
];

const columns = [
  { key: 'id', label: 'Nº OS', render: v => <span className="font-mono text-xs font-bold text-gray-800">{v}</span> },
  { key: 'cliente', label: 'Cliente' },
  { key: 'equipamento', label: 'Equipamento', render: v => <span className="max-w-[200px] truncate block">{v}</span> },
  { key: 'tipo', label: 'Tipo' },
  { key: 'tecnico', label: 'Tecnico' },
  { key: 'previsao', label: 'Previsao', render: v => <span className="text-gray-500">{v ? new Date(v).toLocaleDateString('pt-BR') : '-'}</span> },
  { key: 'valor', label: 'Valor', render: v => <span className="font-semibold">R$ {(v || 0).toLocaleString('pt-BR')}</span> },
  { key: 'prioridade', label: 'Prioridade', render: v => <StatusBadge status={v} /> },
  { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
];

export default function OrdensServico() {
  const [filter, setFilter] = useState('all');
  const [selectedOS, setSelectedOS] = useState(null);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(mockOS);

  useEffect(() => {
    const loadData = async () => {
      if (!isConfigured()) return;
      const { data: osData } = await db.ordensServico.list({ status: filter, search });
      if (osData) setData(osData);
    };
    loadData();
  }, [filter, search]);

  const filtered = data.filter(os => {
    const matchStatus = filter === 'all' || os.status === filter;
    const matchSearch = !search || os.cliente.toLowerCase().includes(search.toLowerCase()) || os.id.includes(search);
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (isConfigured()) {
      const { error } = await db.ordensServico.create({
        cliente: 'Novo Cliente',
        equipamento: 'Equipamento',
        tipo: 'Manutencao Preventiva',
        status: 'pendente',
        prioridade: 'normal',
        tecnico: 'A definir',
        valor: 0,
      });
      if (!error) toast.success('OS criada!');
    } else {
      toast.success('Nova OS criada com sucesso!');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input type="text" placeholder="Buscar por cliente ou Nº OS..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
        <Button onClick={handleCreate} variant="primary">
          <Plus size={16} /> Nova OS
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f.value ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {f.label}
            {f.value !== 'all' && <span className="ml-1.5 opacity-60">{data.filter(os => os.status === f.value).length}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: filtered.length, color: 'text-gray-800' },
          { label: 'Valor Total', value: `R$ ${filtered.reduce((a, o) => a + (o.valor || 0), 0).toLocaleString('pt-BR')}`, color: 'text-gray-800' },
          { label: 'Urgentes', value: filtered.filter(o => o.prioridade === 'urgente').length, color: 'text-red-600' },
          { label: 'Concluidas', value: filtered.filter(o => o.status === 'concluido').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={setSelectedOS} />
      {selectedOS && <OSDetailModal os={selectedOS} onClose={() => setSelectedOS(null)} />}
    </div>
  );
}
