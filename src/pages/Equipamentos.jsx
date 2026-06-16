import { useState } from 'react';
import { Plus, Search, Edit3, Trash2, Wrench, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useEquipamentos, useCreateEquipamento, useUpdateEquipamento, useDeleteEquipamento } from '../hooks/useEquipamentos';
import EquipamentoModal from '../components/equipamentos/EquipamentoModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

export default function Equipamentos() {
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: eqList, isLoading, isError, error, refetch } = useEquipamentos(filters);
  const createEq = useCreateEquipamento();
  const updateEq = useUpdateEquipamento();
  const deleteEq = useDeleteEquipamento();

  const handleCreate = async (data) => {
    await createEq.mutateAsync(data);
    toast.success('Equipamento cadastrado com sucesso!');
  };

  const handleUpdate = async (data) => {
    if (!editingEq) return;
    await updateEq.mutateAsync({ id: editingEq.id, updates: data });
    toast.success('Equipamento atualizado!');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEq.mutateAsync(deleteTarget.id);
    toast.success('Equipamento excluido!');
    setDeleteTarget(null);
  };

  const stats = {
    total: eqList.length,
    locados: eqList.filter((e) => e.status === 'locado').length,
    disponiveis: eqList.filter((e) => e.status === 'disponivel').length,
    manutencao: eqList.filter((e) => e.status === 'manutencao').length,
  };

  if (isLoading) return <div className="p-6"><CardSkeleton count={6} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipamentos</h2>
          <p className="text-sm text-gray-500">{stats.total} equipamentos cadastrados</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Novo Equipamento</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Locados', value: stats.locados, color: 'bg-green-100 text-green-700' },
          { label: 'Disponiveis', value: stats.disponiveis, color: 'bg-blue-100 text-blue-700' },
          { label: 'Manutencao', value: stats.manutencao, color: 'bg-red-100 text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nome ou categoria..." value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input-base pl-10" />
        </div>
        <div className="flex gap-2">
          {['all', 'locado', 'disponivel', 'manutencao'].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filters.status === s ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {eqList.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum equipamento encontrado" description="Cadastre seu primeiro equipamento."
          action={<Button icon={Plus} onClick={() => setShowCreateModal(true)}>Novo Equipamento</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eqList.map((eq) => (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono text-gray-400">{eq.id}</p>
                  <h3 className="font-bold text-gray-900">{eq.nome}</h3>
                </div>
                <StatusBadge status={eq.status} />
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> {eq.categoria}</div>
                {eq.cliente && eq.cliente !== '-' && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {eq.cliente}</div>}
                {eq.valorMensal > 0 && <div className="font-medium text-green-600">R$ {eq.valorMensal.toLocaleString('pt-BR')}/mes</div>}
                {eq.horasUso > 0 && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {eq.horasUso}h de uso</div>}
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setEditingEq(eq)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => setDeleteTarget(eq)}
                  className="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EquipamentoModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      <EquipamentoModal isOpen={!!editingEq} onClose={() => setEditingEq(null)} onSave={handleUpdate} equipamento={editingEq} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir Equipamento" message={`Tem certeza que deseja excluir ${deleteTarget?.nome}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir" danger />
    </div>
  );
}
