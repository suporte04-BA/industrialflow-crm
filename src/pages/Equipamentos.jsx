import { useState, useEffect } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { Plus, Package, Clock, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { db, isConfigured } from '../lib/supabase';
import { equipamentos as mockEq } from '../data/mockData';

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Locados', value: 'locado' },
  { label: 'Disponiveis', value: 'disponivel' },
  { label: 'Manutencao', value: 'manutencao' },
];

export default function Equipamentos() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(mockEq);

  useEffect(() => {
    const loadData = async () => {
      if (!isConfigured()) return;
      const { data: eqData } = await db.equipamentos.list({ status: filter, search });
      if (eqData) setData(eqData);
    };
    loadData();
  }, [filter, search]);

  const filtered = data.filter(eq => {
    const matchStatus = filter === 'all' || eq.status === filter;
    const matchSearch = !search || eq.nome.toLowerCase().includes(search.toLowerCase()) || eq.categoria.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Buscar equipamento ou categoria..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
        <Button onClick={() => toast.success('Equipamento cadastrado!')} variant="primary">
          <Plus size={16} /> Novo Equipamento
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f.value ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Locados', value: data.filter(e => e.status === 'locado').length, icon: Package, color: 'text-blue-600' },
          { label: 'Disponiveis', value: data.filter(e => e.status === 'disponivel').length, icon: Clock, color: 'text-green-600' },
          { label: 'Manutencao', value: data.filter(e => e.status === 'manutencao').length, icon: Wrench, color: 'text-orange-600' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(eq => (
          <div key={eq.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#1C1C1C] rounded-lg flex items-center justify-center">
                <Package size={18} className="text-yellow-400" />
              </div>
              <StatusBadge status={eq.status} />
            </div>
            <h3 className="font-bold text-[#1C1C1C] text-sm leading-tight mb-1">{eq.nome}</h3>
            <p className="text-xs text-gray-400 mb-4">{eq.categoria} · {eq.id}</p>
            <div className="space-y-2">
              {eq.status === 'locado' && (
                <>
                  <InfoLine label="Cliente" value={eq.cliente} />
                  <InfoLine label="Contrato" value={eq.contrato} />
                  <InfoLine label="Fim da Locacao" value={eq.locacaoFim ? new Date(eq.locacaoFim).toLocaleDateString('pt-BR') : '-'} />
                  <InfoLine label="Valor/mes" value={`R$ ${(eq.valorMensal || 0).toLocaleString('pt-BR')}`} highlight />
                </>
              )}
              <InfoLine label="Horas de Uso" value={`${eq.horasUso || 0}h`} />
              <InfoLine label="Ultima Revisao" value={eq.ultimaRevisao ? new Date(eq.ultimaRevisao).toLocaleDateString('pt-BR') : '-'} />
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              <button className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                onClick={() => toast.info(`Detalhes de ${eq.nome}`)}>Ver OS</button>
              <button className="flex-1 text-xs py-2 rounded-lg bg-yellow-400 text-[#1C1C1C] font-semibold hover:bg-yellow-300 transition-colors"
                onClick={() => toast.success('Acao registrada!')}>
                {eq.status === 'disponivel' ? 'Locar' : 'Gerenciar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoLine({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${highlight ? 'text-yellow-600 font-bold' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}
