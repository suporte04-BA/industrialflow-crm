import { useState } from 'react';
import { Trash2, FileText, Search, ChevronDown, ChevronUp, Building2, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { detectDocumentType } from '../lib/validation';
import { useComprovantes, useDeleteComprovante } from '../hooks/useComprovantes';
import { useContratos } from '../hooks/useContratos';
import { useDevolucoes } from '../hooks/useDevolucoes';
import { generateEntregaPDF } from '../lib/pdfExport';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function ComprovanteEntrega() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const { data: contratos } = useContratos();
  const { data: devolucoes } = useDevolucoes();
  const deleteComprovante = useDeleteComprovante();

  const filteredComprovantes = (comprovantes || []).filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.contrato || '').toLowerCase().includes(term) ||
      (c.locatario || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term) ||
      (c.telefone || '').toLowerCase().includes(term) ||
      (c.cidade || '').toLowerCase().includes(term)
    );
  });

  const getContrato = (contratoId) => (contratos || []).find((c) => c.id === contratoId);
  const hasDevolucao = (comprovanteId) => (devolucoes || []).some((d) => d.comprovanteId === comprovanteId);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteComprovante.mutateAsync(deleteTarget.id);
      toast.success('Comprovante excluido!');
      setDeleteTarget(null);
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleGeneratePDF = async (comprovante) => {
    try {
      await generateEntregaPDF(comprovante);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  if (isLoading) return <div className="p-4 sm:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 sm:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 px-3 sm:px-0 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Comprovantes de Entrega</h2>
          <p className="text-sm text-gray-500">{(comprovantes || []).length} comprovantes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por contrato, locatario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>
      </div>

      {(comprovantes || []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum comprovante"
          description="Comprovantes serao criados automaticamente apos assinatura digital ou importacao via pagina dedicada."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredComprovantes.map((c) => {
            const contratoData = c.contratoId ? getContrato(c.contratoId) : null;
            const isExpanded = expandedId === c.id;
            const jaDevolvido = hasDevolucao(c.id);
            return (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{c.contrato}</span>
                      <StatusBadge status={c.status} />
                      {c.assinado && <StatusBadge status="assinado" />}
                      {jaDevolvido && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Devolvido</span>}
                      {contratoData && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Building2 className="w-3 h-3" />
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
                    <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                      {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
                      {c.telefone && <p>{c.telefone}</p>}
                      {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
                      {c.signatarioNome && <p className="text-xs text-green-600">Assinado por: {c.signatarioNome}</p>}
                    </div>
                    {c.itens && c.itens.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns)</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => handleGeneratePDF(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Gerar PDF Entrega">
                        <Download className="w-4 h-4" />
                      </button>
                      {c.assinado && !jaDevolvido && (
                        <span className="p-1.5 text-gray-300" title="Ainda nao devolvido">
                          <RotateCcw className="w-4 h-4" />
                        </span>
                      )}
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && contratoData && (
                  <div className="mt-3 pt-3 border-t bg-gray-50 rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Detalhes do Contrato</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{contratoData.cliente}</span></div>
                      <div><span className="text-gray-500">CNPJ:</span> <span className="font-medium">{contratoData.cnpj || '-'}</span></div>
                      <div><span className="text-gray-500">Status:</span> <StatusBadge status={contratoData.status} /></div>
                      <div><span className="text-gray-500">Inicio:</span> <span className="font-medium">{contratoData.inicio || '-'}</span></div>
                      <div><span className="text-gray-500">Fim:</span> <span className="font-medium">{contratoData.fim || '-'}</span></div>
                      <div><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium text-green-600">R$ {Number(contratoData.valorMensal || 0).toLocaleString('pt-BR')}/mes</span></div>
                      <div className="sm:col-span-3"><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(contratoData.equipamentos) ? contratoData.equipamentos.join(', ') : '-'}</span></div>
                      {contratoData.numero && <div><span className="text-gray-500">Numero:</span> <span className="font-medium">{contratoData.numero}</span></div>}
                      {contratoData.metodoEntrega && <div><span className="text-gray-500">Metodo:</span> <span className="font-medium">{contratoData.metodoEntrega === 'cliente_retirada' ? 'Cliente retira' : 'Locadora entrega'}</span></div>}
                      {contratoData.referencia && <div><span className="text-gray-500">Referencia:</span> <span className="font-medium">{contratoData.referencia}</span></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Comprovante"
        message={`Excluir comprovante do contrato ${deleteTarget?.contrato}?`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
