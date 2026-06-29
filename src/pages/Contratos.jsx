import { useState } from 'react';
import { Plus, Search, Edit3, Trash2, RotateCcw, FileText, Download, ClipboardCheck, Calendar, MapPin, Wrench, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import { useContratos, useCreateContrato, useUpdateContrato, useDeleteContrato } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import ContratoModal from '../components/contratos/ContratoModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import { generateContratoPDF } from '../lib/pdfExport';

export default function Contratos() {
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCt, setEditingCt] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: ctList, isLoading, isError, error, refetch } = useContratos(filters);
  const { data: comprovantes } = useComprovantes();
  const createCt = useCreateContrato();
  const updateCt = useUpdateContrato();
  const deleteCt = useDeleteContrato();

  const handleSearch = () => setFilters(prev => ({ ...prev, search: searchInput }));
  const clearSearch = () => { setSearchInput(''); setFilters(prev => ({ ...prev, search: '' })); };

  const handleCreate = async (data) => {
    await createCt.mutateAsync(data);
    toast.success('Contrato criado com sucesso!');
  };

  const handleUpdate = async (data) => {
    if (!editingCt) return;
    await updateCt.mutateAsync({ id: editingCt.id, updates: data });
    toast.success('Contrato atualizado!');
  };

  const handleRenew = async (data) => {
    if (!renewTarget) return;
    await updateCt.mutateAsync({ id: renewTarget.id, updates: { ...data, status: 'ativo' } });
    toast.success('Contrato renovado!');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCt.mutateAsync(deleteTarget.id);
    toast.success('Contrato excluido!');
    setDeleteTarget(null);
  };

  const handleExportPDF = async (ct) => {
    try {
      await generateContratoPDF(ct);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const stats = {
    total: ctList.length,
    ativos: ctList.filter((c) => c.status === 'ativo').length,
    vencendo: ctList.filter((c) => c.status === 'vencendo').length,
    vencidos: ctList.filter((c) => c.status === 'vencido').length,
    entregues: comprovantes?.filter(c => c.assinado).length || 0,
  };

  if (isLoading) return <div className="p-4 md:p-6"><CardSkeleton count={6} /></div>;
  if (isError) return <div className="p-4 md:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Contratos</h2>
          <p className="text-xs md:text-sm text-gray-500">{stats.total} contratos cadastrados</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'Ativos', value: stats.ativos, color: 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' },
          { label: 'Vencendo', value: stats.vencendo, color: 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm' },
          { label: 'Vencidos', value: stats.vencidos, color: 'bg-red-50 text-red-700 border-red-300 shadow-sm' },
          { label: 'Total', value: stats.total, color: 'bg-slate-50 text-slate-700 border-slate-300 shadow-sm' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 md:p-4 border ${s.color}`}>
            <p className="text-lg md:text-2xl font-bold">{s.value}</p>
            <p className="text-xs md:text-sm opacity-80 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
        <div className="flex flex-wrap gap-1.5">
          {['all', 'ativo', 'vencendo', 'vencido', 'entregue', 'cancelado'].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-2.5 py-1.5 rounded-full text-[11px] md:text-xs font-medium transition-colors ${
                filters.status === s ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {ctList.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum contrato encontrado" description="Crie seu primeiro contrato."
          action={<Button icon={Plus} onClick={() => setShowCreateModal(true)}>Novo Contrato</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {ctList.map((ct) => {
            const isEntregue = ct.status === 'entregue' || comprovantes?.some(c => (c.contratoId || c.contrato_id) === ct.id && c.assinado);
            return (
              <div key={ct.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] md:text-xs font-mono text-gray-400">{ct.id}</p>
                      <StatusBadge status={ct.status} />
                      {isEntregue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                          <ClipboardCheck className="w-2.5 h-2.5" /> Entregue
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm md:text-base mt-1 truncate">{ct.cliente}</h3>
                    {ct.cnpj && <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">CNPJ: {ct.cnpj}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs md:text-sm text-gray-600 mb-3">
                  {Array.isArray(ct.equipamentos) && ct.equipamentos.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Wrench className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{ct.equipamentos.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span>{ct.inicio || '-'} a {ct.fim || '-'}</span>
                  </div>
                  {ct.cidade && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{ct.cidade}{ct.estado ? `/${ct.estado}` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-500" />
                      <span className="font-semibold text-green-600">R$ {Number(ct.valorMensal || 0).toLocaleString('pt-BR')}/mes</span>
                    </div>
                    <span className="text-gray-500 text-xs">Total: R$ {Number(ct.valorTotal || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  {ct.vencimentoDias != null && (
                    <div className={`text-[10px] md:text-xs font-medium ${ct.vencimentoDias <= 0 ? 'text-red-600' : ct.vencimentoDias <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {ct.vencimentoDias <= 0 ? 'Vencido' : `${ct.vencimentoDias} dias para vencer`}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                  <button onClick={() => setEditingCt(ct)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <Edit3 className="w-3 h-3" /> <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button onClick={() => handleExportPDF(ct)}
                    className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Gerar PDF">
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={() => setRenewTarget(ct)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Renovar</span>
                  </button>
                  <button onClick={() => setDeleteTarget(ct)}
                    className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ContratoModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      <ContratoModal isOpen={!!editingCt} onClose={() => setEditingCt(null)} onSave={handleUpdate} contrato={editingCt} />
      <ContratoModal isOpen={!!renewTarget} onClose={() => setRenewTarget(null)} onSave={handleRenew} contrato={renewTarget} isRenew />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir Contrato" message={`Tem certeza que deseja excluir o contrato ${deleteTarget?.numero || deleteTarget?.cliente || deleteTarget?.id}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir" danger />
    </div>
  );
}
