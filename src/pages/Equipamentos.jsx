import { useState } from 'react';
import { Plus, Search, Edit3, Trash2, Wrench, Clock, X, Calendar, DollarSign, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useEquipamentos, useCreateEquipamento, useUpdateEquipamento, useDeleteEquipamento } from '../hooks/useEquipamentos';
import EquipamentoModal from '../components/equipamentos/EquipamentoModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import { formatDateBR, daysUntil } from '../lib/dates';

export default function Equipamentos() {
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingEq, setViewingEq] = useState(null);

  const { data: eqList, isLoading, isError, error, refetch } = useEquipamentos(filters);
  const createEq = useCreateEquipamento();
  const updateEq = useUpdateEquipamento();
  const deleteEq = useDeleteEquipamento();

  const handleSearch = () => setFilters(prev => ({ ...prev, search: searchInput }));
  const clearSearch = () => { setSearchInput(''); setFilters(prev => ({ ...prev, search: '' })); };

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

  if (isLoading) return <div className="p-6"><CardSkeleton count={6} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  const stats = {
    total: eqList.length,
    locados: eqList.filter((e) => e.status === 'locado').length,
    disponiveis: eqList.filter((e) => e.status === 'disponivel').length,
    manutencao: eqList.filter((e) => e.status === 'manutencao').length,
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipamentos</h2>
          <p className="text-sm text-gray-500">{stats.total} equipamentos cadastrados</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Novo Equipamento</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-700 shadow-sm' },
          { label: 'Locados', value: stats.locados, color: 'bg-blue-100 text-blue-700 shadow-sm' },
          { label: 'Disponiveis', value: stats.disponiveis, color: 'bg-emerald-100 text-emerald-700 shadow-sm' },
          { label: 'Manutencao', value: stats.manutencao, color: 'bg-orange-100 text-orange-700 shadow-sm' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm opacity-80 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
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
        <button onClick={handleSearch} className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-medium text-sm hover:bg-yellow-300 transition-colors flex items-center gap-1.5">
          <Search className="w-4 h-4" /> Buscar
        </button>
        <div className="flex flex-wrap gap-2">
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
          {eqList.map((eq) => {
            const diasRestantes = daysUntil(eq.locacaoFim);
            return (
              <div key={eq.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingEq(eq)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-400">{eq.id}</p>
                    <h3 className="font-bold text-gray-900 truncate">{eq.nome}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{eq.categoria}</p>
                  </div>
                  <StatusBadge status={eq.status} />
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {eq.cliente && eq.cliente !== '-' && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{eq.cliente}</span>
                    </div>
                  )}
                  {eq.contrato && eq.contrato !== '-' && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{eq.contrato}</span>
                    </div>
                  )}
                  {eq.locacaoFim && eq.locacaoFim !== '-' && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Ate {formatDateBR(eq.locacaoFim)}</span>
                      {diasRestantes !== null && (
                        <span className={`text-xs font-medium ${diasRestantes < 0 ? 'text-red-500' : diasRestantes < 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : `${diasRestantes}d restantes`}
                        </span>
                      )}
                    </div>
                  )}
                  {eq.valorMensal > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-green-600">R$ {eq.valorMensal.toLocaleString('pt-BR')}/mes</span>
                    </div>
                  )}
                  {eq.horasUso > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{eq.horasUso.toLocaleString('pt-BR')}h de uso</span>
                    </div>
                  )}
                  {eq.ultimaRevisao && eq.ultimaRevisao !== '-' && (
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-gray-400" />
                      <span>Ultima revisao: {formatDateBR(eq.ultimaRevisao)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button onClick={(e) => { e.stopPropagation(); setEditingEq(eq); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(eq); }}
                    className="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {viewingEq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingEq(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{viewingEq.nome}</h2>
                  <p className="text-sm text-gray-500">{viewingEq.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={viewingEq.status} />
                  <button onClick={() => setViewingEq(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Categoria</p>
                    <p className="text-sm font-semibold text-gray-900">{viewingEq.categoria}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                    <p className="text-sm font-semibold text-gray-900">{viewingEq.status === 'locado' ? 'Locado' : viewingEq.status === 'disponivel' ? 'Disponivel' : 'Manutencao'}</p>
                  </div>
                </div>

                {viewingEq.cliente && viewingEq.cliente !== '-' && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Dados da Locacao</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="text-sm font-medium text-gray-900">{viewingEq.cliente}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Contrato</p>
                        <p className="text-sm font-medium text-gray-900">{viewingEq.contrato || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Inicio</p>
                        <p className="text-sm font-medium text-gray-900">{formatDateBR(viewingEq.locacaoInicio)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fim</p>
                        <p className="text-sm font-medium text-gray-900">{formatDateBR(viewingEq.locacaoFim)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valor Mensal</p>
                        <p className="text-sm font-semibold text-green-600">R$ {(viewingEq.valorMensal || 0).toLocaleString('pt-BR')}/mes</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Dados Tecnicos</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Horas de Uso</p>
                      <p className="text-sm font-medium text-gray-900">{(viewingEq.horasUso || 0).toLocaleString('pt-BR')}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ultima Revisao</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateBR(viewingEq.ultimaRevisao)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => { setViewingEq(null); setEditingEq(viewingEq); }} icon={Edit3} className="flex-1">
                    Editar
                  </Button>
                  <Button onClick={() => { setViewingEq(null); setDeleteTarget(viewingEq); }} icon={Trash2} variant="danger" className="flex-1">
                    Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EquipamentoModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      <EquipamentoModal isOpen={!!editingEq} onClose={() => setEditingEq(null)} onSave={handleUpdate} equipamento={editingEq} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir Equipamento" message={`Tem certeza que deseja excluir ${deleteTarget?.nome}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir" danger />
    </div>
  );
}
