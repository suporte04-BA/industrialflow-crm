import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Edit3, Trash2, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { useOrdensServico, useCreateOS, useUpdateOS, useDeleteOS } from '../hooks/useOrdensServico';
import OSDetailModal from '../components/os/OSDetailModal';
import OSModal from '../components/os/OSModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

export default function OrdensServico() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [editingOS, setEditingOS] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const expandHandled = useRef(false);

  const { data: osList, isLoading, isError, error, refetch } = useOrdensServico(filters);
  const createOS = useCreateOS();
  const updateOS = useUpdateOS();
  const deleteOS = useDeleteOS();

  const expandId = searchParams.get('expand');

  useEffect(() => {
    if (expandHandled.current) return;
    if (expandId && osList && osList.length > 0) {
      const found = osList.find((o) => String(o.id) === String(expandId));
      if (found) {
        expandHandled.current = true;
        setTimeout(() => {
          setSelectedOS(found);
          setSearchParams({}, { replace: true });
        }, 0);
      }
    }
  }, [expandId, osList, setSearchParams]);

  const handleSearch = () => setFilters(prev => ({ ...prev, search: searchInput }));
  const clearSearch = () => { setSearchInput(''); setFilters(prev => ({ ...prev, search: '' })); };

  const handleCreate = async (data) => {
    await createOS.mutateAsync(data);
    toast.success('Ordem de servico criada com sucesso!');
  };

  const handleUpdate = async (data) => {
    if (!editingOS) return;
    await updateOS.mutateAsync({ id: editingOS.id, updates: data });
    toast.success('Ordem de servico atualizada!');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteOS.mutateAsync(deleteTarget.id);
    toast.success('Ordem de servico excluida!');
    setDeleteTarget(null);
  };

  const handleUpdateStatus = async (osId, newStatus) => {
    try {
      await updateOS.mutateAsync({ id: osId, updates: { status: newStatus } });
      toast.success('Status atualizado!');
      setSelectedOS(null);
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar status');
    }
  };

  if (isLoading) return <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  const statusCounts = {
    all: osList.length,
    pendente: osList.filter((o) => o.status === 'pendente').length,
    em_andamento: osList.filter((o) => o.status === 'em_andamento').length,
    concluido: osList.filter((o) => o.status === 'concluido').length,
    cancelado: osList.filter((o) => o.status === 'cancelado').length,
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ordens de Servico</h2>
          <p className="text-sm text-gray-500">{osList.length} ordens cadastradas</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Nova OS</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'pendente', 'em_andamento', 'concluido', 'cancelado'].map((s) => (
          <button key={s} onClick={() => setFilters({ ...filters, status: s })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.status === s ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s === 'all' ? 'Todas' : s.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} ({statusCounts[s]})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Pressione Enter para buscar..." value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          className="input-base pl-10 pr-9" />
        {searchInput && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {osList.length === 0 ? (
        <EmptyState icon={Filter} title="Nenhuma OS encontrada" description="Ajuste os filtros ou crie uma nova ordem de servico."
          action={<Button icon={Plus} onClick={() => setShowCreateModal(true)}>Nova OS</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {osList.map((os) => (
              <div key={os.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-yellow-600" translate="no">{os.id}</span>
                    <StatusBadge status={os.status} />
                  </div>
                  <StatusBadge status={os.prioridade} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm truncate">{os.cliente}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{os.equipamento || '-'} | {os.tipo || '-'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-green-600">R$ {Number(os.valor || 0).toLocaleString('pt-BR')}</span>
                  <span className="text-xs text-gray-400">{os.tecnico || '-'}</span>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => setSelectedOS(os)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye className="w-3 h-3" /> Detalhes
                  </button>
                  <button onClick={() => setEditingOS(os)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <Edit3 className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => setDeleteTarget(os)}
                    className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Equipamento</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Prioridade</th>
                    <th className="px-4 py-3 font-medium">Tecnico</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {osList.map((os) => (
                    <tr key={os.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-yellow-600" translate="no">{os.id}</td>
                      <td className="px-4 py-3 font-medium">{os.cliente}</td>
                      <td className="px-4 py-3">{os.equipamento}</td>
                      <td className="px-4 py-3 text-gray-600">{os.tipo}</td>
                      <td className="px-4 py-3"><StatusBadge status={os.status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={os.prioridade} /></td>
                      <td className="px-4 py-3 text-gray-600">{os.tecnico}</td>
                      <td className="px-4 py-3 font-medium">R$ {Number(os.valor || 0).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedOS(os)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingOS(os)} className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600" title="Editar">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(os)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <OSDetailModal isOpen={!!selectedOS} onClose={() => setSelectedOS(null)} os={selectedOS} onUpdateStatus={handleUpdateStatus} />
      <OSModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      <OSModal isOpen={!!editingOS} onClose={() => setEditingOS(null)} onSave={handleUpdate} os={editingOS} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir Ordem de Servico" message={`Tem certeza que deseja excluir a OS ${deleteTarget?.id}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir" danger />
    </div>
  );
}
