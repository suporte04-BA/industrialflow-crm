import { useState } from 'react';
import { Plus, Search, Edit3, Trash2, RotateCcw, FileText, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useContratos, useCreateContrato, useUpdateContrato, useDeleteContrato } from '../hooks/useContratos';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCt, setEditingCt] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: ctList, isLoading, isError, error, refetch } = useContratos(filters);
  const createCt = useCreateContrato();
  const updateCt = useUpdateContrato();
  const deleteCt = useDeleteContrato();

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
  };

  if (isLoading) return <div className="p-6"><CardSkeleton count={6} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contratos</h2>
          <p className="text-sm text-gray-500">{stats.total} contratos cadastrados</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Novo Contrato</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Ativos', value: stats.ativos, color: 'bg-green-100 text-green-700', icon: CheckCircle },
          { label: 'Vencendo', value: stats.vencendo, color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
          { label: 'Vencidos', value: stats.vencidos, color: 'bg-red-100 text-red-700', icon: AlertTriangle },
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700', icon: FileText },
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
          <input type="text" placeholder="Buscar por cliente ou ID..." value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input-base pl-10" />
        </div>
        <div className="flex gap-2">
          {['all', 'ativo', 'vencendo', 'vencido', 'cancelado'].map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: s })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ctList.map((ct) => (
            <div key={ct.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono text-gray-400">{ct.id}</p>
                  <h3 className="font-bold text-gray-900">{ct.cliente}</h3>
                  {ct.cnpj && <p className="text-xs text-gray-500 mt-1">CNPJ: {ct.cnpj}</p>}
                </div>
                <StatusBadge status={ct.status} />
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>Equipamentos: {Array.isArray(ct.equipamentos) ? ct.equipamentos.join(', ') : ct.equipamentos}</div>
                <div>Periodo: {ct.inicio} a {ct.fim}</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-600">R$ {Number(ct.valorMensal).toLocaleString('pt-BR')}/mes</span>
                  <span className="text-gray-500">Total: R$ {Number(ct.valorTotal).toLocaleString('pt-BR')}</span>
                </div>
                {ct.vencimentoDias != null && (
                  <div className={`text-xs font-medium ${ct.vencimentoDias <= 0 ? 'text-red-600' : ct.vencimentoDias <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {ct.vencimentoDias <= 0 ? 'Vencido' : `${ct.vencimentoDias} dias para vencer`}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setEditingCt(ct)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => handleExportPDF(ct)}
                  className="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Gerar PDF">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setRenewTarget(ct)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Renovar
                </button>
                <button onClick={() => setDeleteTarget(ct)}
                  className="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ContratoModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      <ContratoModal isOpen={!!editingCt} onClose={() => setEditingCt(null)} onSave={handleUpdate} contrato={editingCt} />
      <ContratoModal isOpen={!!renewTarget} onClose={() => setRenewTarget(null)} onSave={handleRenew} contrato={renewTarget} isRenew />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir Contrato" message={`Tem certeza que deseja excluir o contrato ${deleteTarget?.id}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir" danger />
    </div>
  );
}
