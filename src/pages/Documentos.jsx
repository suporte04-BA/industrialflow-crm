import { useState } from 'react';
import { Trash2, Search, RotateCcw, ClipboardCheck, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { detectDocumentType } from '../lib/validation';
import { useComprovantes, useDeleteComprovante } from '../hooks/useComprovantes';
import { useContratos } from '../hooks/useContratos';
import { useDevolucoes } from '../hooks/useDevolucoes';
import { generateEntregaPDF, generateDevolucaoPDF } from '../lib/pdfExport';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

const TABS = [
  { key: 'entrega', label: 'Entrega', icon: ClipboardCheck },
  { key: 'devolucao', label: 'Devolução', icon: RotateCcw },
];

function EntregaCard({ c, contratoData, isExpanded, onDelete, onGeneratePDF, onToggleExpand }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onToggleExpand}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
          <div className="text-sm text-gray-500 mt-1 space-y-0.5">
            {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
            {c.telefoneEntrega && <p>{c.telefoneEntrega}</p>}
            {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
            {c.nomeSignatario && <p className="text-xs text-green-600">Assinado por: {c.nomeSignatario}</p>}
          </div>
          {c.itens && c.itens.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns)</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="flex gap-1 mt-2">
            <button onClick={() => onGeneratePDF(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Gerar PDF Entrega">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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
            <div><span className="text-gray-500">{detectDocumentType(contratoData.cnpj) === 'cpf' ? 'CPF' : 'CNPJ'}:</span> <span className="font-medium">{contratoData.cnpj || '-'}</span></div>
            <div><span className="text-gray-500">Status:</span> <StatusBadge status={contratoData.status} /></div>
            <div><span className="text-gray-500">Inicio:</span> <span className="font-medium">{contratoData.inicio || '-'}</span></div>
            <div><span className="text-gray-500">Fim:</span> <span className="font-medium">{contratoData.fim || '-'}</span></div>
            <div><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium text-green-600">R$ {Number(contratoData.valorMensal || 0).toLocaleString('pt-BR')}/mes</span></div>
            <div className="sm:col-span-3"><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(contratoData.equipamentos) ? contratoData.equipamentos.join(', ') : '-'}</span></div>
            {contratoData.numero && <div><span className="text-gray-500">Numero:</span> <span className="font-medium">{contratoData.numero}</span></div>}
            {contratoData.referencia && <div><span className="text-gray-500">Referencia:</span> <span className="font-medium">{contratoData.referencia}</span></div>}
          </div>
          {c.itens && c.itens.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Itens</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-1 pr-2">Qtde</th>
                      <th className="text-left py-1 pr-2">Descricao</th>
                      <th className="text-left py-1 pr-2">Patrim.</th>
                      <th className="text-left py-1 pr-2">D.Loc</th>
                      <th className="text-left py-1 pr-2">D.Dev</th>
                      <th className="text-right py-1">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.itens.map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2">{it.quantidade || 1}</td>
                        <td className="py-1 pr-2">{it.descricao || '-'}</td>
                        <td className="py-1 pr-2">{it.patrimonio || '-'}</td>
                        <td className="py-1 pr-2">{it.dataLocacao || '-'}</td>
                        <td className="py-1 pr-2">{it.dataDevolucao || '-'}</td>
                        <td className="py-1 text-right">R$ {Number(it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DevolucaoCard({ c, contratoData, isExpanded, onDelete, onToggleExpand }) {
  const condicoes = c.condicoesDevolucao || c.condicoes || {};
  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onToggleExpand}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
          <div className="text-sm text-gray-500 mt-1 space-y-0.5">
            {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
            {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
            {c.nomeSignatario && <p className="text-xs text-orange-600">Assinado por: {c.nomeSignatario}</p>}
          </div>
          {c.itens && c.itens.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns) para devolucao</p>
          )}
          {(condicoes.danificado || condicoes.extraviado || condicoes.testarEmpresa) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {condicoes.danificado && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Danificado/Sujo</span>}
              {condicoes.extraviado && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Extraviado</span>}
              {condicoes.testarEmpresa && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Testar na empresa</span>}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex gap-1 mt-2">
            <button onClick={() => onDelete(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t bg-orange-50 rounded-lg p-3 space-y-2">
          {contratoData && (
            <>
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Detalhes do Contrato</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{contratoData.cliente}</span></div>
                <div><span className="text-gray-500">{detectDocumentType(contratoData.cnpj) === 'cpf' ? 'CPF' : 'CNPJ'}:</span> <span className="font-medium">{contratoData.cnpj || '-'}</span></div>
                <div><span className="text-gray-500">Referencia:</span> <span className="font-medium">{contratoData.referencia || '-'}</span></div>
              </div>
            </>
          )}
          {c.itens && c.itens.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Itens para Devolucao</p>
              {c.itens.map((it, i) => (
                <div key={i} className="text-xs flex items-center gap-2 py-0.5">
                  <span className="w-3 h-3 border border-gray-400 rounded flex-shrink-0" />
                  <span>{it.quantidade || 1}x {it.descricao} ({it.patrimonio || '-'})</span>
                </div>
              ))}
            </div>
          )}
          {c.condicoesDevolucao && (
            <div className="text-xs">
              <span className="font-semibold text-gray-500">Condicoes: </span>
              {c.condicoesDevolucao.danificado && <span className="text-orange-600">Danificado/Sujo </span>}
              {c.condicoesDevolucao.extraviado && <span className="text-red-600">Extraviado </span>}
              {c.condicoesDevolucao.testarEmpresa && <span className="text-blue-600">Testar na empresa </span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Documentos() {
  const [activeTab, setActiveTab] = useState('entrega');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const { data: contratos } = useContratos();
  const { data: devolucoes } = useDevolucoes();
  const deleteComprovante = useDeleteComprovante();

  const handleSearch = () => setSearch(searchInput);
  const clearSearch = () => { setSearchInput(''); setSearch(''); };

  const getContrato = (contratoId) => (contratos || []).find((c) => c.id === contratoId);

  const filterByTab = (list, tab) => {
    return list.filter((c) => {
      if (tab === 'entrega') return c.tipoDocumento === 'entrega';
      return c.tipoDocumento === 'devolucao';
    });
  };

  const filteredComprovantes = filterByTab(comprovantes || [], activeTab).filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (c.contrato || '').toLowerCase().includes(term) ||
      (c.locatario || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term) ||
      (c.cidade || '').toLowerCase().includes(term) ||
      (c.endereco || '').toLowerCase().includes(term) ||
      (c.bairro || '').toLowerCase().includes(term) ||
      (c.telefoneEntrega || c.telefone_entrega || '').toLowerCase().includes(term)
    );
  });

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
      if (comprovante.tipoDocumento === 'devolucao') {
        const devMatch = (devolucoes || []).find(d => d.comprovanteId === comprovante.id);
        if (devMatch) {
          await generateDevolucaoPDF(devMatch);
        } else {
          await generateDevolucaoPDF(comprovante);
        }
      } else {
        await generateEntregaPDF(comprovante);
      }
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  if (isLoading) return <div className="p-4 sm:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 sm:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  const entregaCount = filterByTab(comprovantes || [], 'entrega').length;
  const devolucaoCount = filterByTab(comprovantes || [], 'devolucao').length;

  return (
    <div className="space-y-4 px-3 sm:px-0 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Documentos</h2>
          <p className="text-sm text-gray-500">{(comprovantes || []).length} comprovantes no total</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === 'entrega' ? entregaCount : devolucaoCount;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? tab.key === 'entrega'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-300'
                    : 'bg-orange-500 text-white shadow-lg shadow-orange-300'
                  : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pressione Enter para buscar..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="input-base pl-9 pr-9 w-full"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filteredComprovantes.length === 0 ? (
        <EmptyState
          icon={activeTab === 'entrega' ? ClipboardCheck : RotateCcw}
          title={activeTab === 'entrega' ? 'Nenhum comprovante de entrega' : 'Nenhum comprovante de devolucao'}
          description={activeTab === 'entrega'
            ? 'Comprovantes de entrega serao criados automaticamente ao criar contratos.'
            : 'Comprovantes de devolucao serao criados ao importar PDFs de devolucao via novo contrato.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredComprovantes.map((c) => {
            const contratoData = c.contratoId ? getContrato(c.contratoId) : null;
            const isExpanded = expandedId === c.id;
            const onToggleExpand = () => setExpandedId(isExpanded ? null : c.id);

            if (activeTab === 'entrega') {
              return (
                <EntregaCard
                  key={c.id}
                  c={c}
                  contratoData={contratoData}
                  isExpanded={isExpanded}
                  onToggleExpand={onToggleExpand}
                  onDelete={setDeleteTarget}
                  onGeneratePDF={handleGeneratePDF}
                />
              );
            }
            return (
              <DevolucaoCard
                key={c.id}
                c={c}
                contratoData={contratoData}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onDelete={setDeleteTarget}
              />
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
