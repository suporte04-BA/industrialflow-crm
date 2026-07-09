import { useState } from 'react';
import { Trash2, Search, RotateCcw, ClipboardCheck, Download, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useComprovantes, useDeleteComprovante } from '../hooks/useComprovantes';
import { useContratos } from '../hooks/useContratos';
import { useDevolucoes } from '../hooks/useDevolucoes';
import { useAssinaturas } from '../hooks/useAssinaturas';
import { generateEntregaPDF, generateDevolucaoPDF } from '../lib/pdfExport';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDateBR } from '../lib/dates';

const TABS = [
  { key: 'entrega', label: 'Entrega', icon: ClipboardCheck },
  { key: 'devolucao', label: 'Devolução', icon: RotateCcw },
];

function SignatarioInfo({ assinatura, expanded }) {
  if (!assinatura) return null;
  return (
    <div className={`${expanded ? 'mt-4 pt-4 border-t-2 border-green-200 bg-green-50 rounded-xl p-4 space-y-3' : 'mt-3 pt-3 border-t bg-green-50 rounded-lg p-3 space-y-2'}`}>
      <div className="flex items-center gap-2">
        <CheckCircle className={`${expanded ? 'w-5 h-5' : 'w-4 h-4'} text-green-600 flex-shrink-0`} />
        <span className={`${expanded ? 'text-sm' : 'text-xs'} font-semibold text-green-800`}>Assinado Digitalmente</span>
      </div>
      <div className={`grid ${expanded ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2 text-xs`}>
        <div>
          <span className="text-gray-500">Recebedor:</span>
          <span className="font-medium block truncate">{assinatura.nomeSignatario}</span>
        </div>
        <div>
          <span className="text-gray-500">CPF/CNPJ:</span>
          <span className="font-medium block" translate="no">{assinatura.cpfSignatario || '-'}</span>
        </div>
        <div className={expanded ? '' : 'col-span-2'}>
          <span className="text-gray-500">Data:</span>
          <span className="font-medium">{assinatura.dataAssinatura ? formatDateBR(assinatura.dataAssinatura) : '-'}</span>
        </div>
      </div>
      {assinatura.assinaturaImagem && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-semibold">Assinatura:</p>
          <img src={assinatura.assinaturaImagem} alt="Assinatura do recebedor"
            className={`border-2 border-green-300 rounded-lg bg-white object-contain p-1 ${expanded ? 'h-28 sm:h-36' : 'h-20 sm:h-24'}`} />
        </div>
      )}
    </div>
  );
}

function EntregaCard({ c, contratoData: _contratoData, assinatura, onDelete, onGeneratePDF, onOpenModal }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onOpenModal}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded" translate="no">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
          <div className="text-xs sm:text-sm text-gray-500 mt-1 space-y-0.5">
            {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
            {c.telefoneEntrega && <p>{c.telefoneEntrega}</p>}
            {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
            {c.nomeSignatario && <p className="text-xs text-green-600 font-medium">Assinado por: {c.nomeSignatario}</p>}
          </div>
          {c.itens && c.itens.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns)</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base sm:text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="flex gap-1 mt-2">
            <button onClick={(e) => { e.stopPropagation(); onGeneratePDF(c); }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Baixar PDF">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(c); }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {assinatura && <SignatarioInfo assinatura={assinatura} />}
    </div>
  );
}

function ComprovanteModal({ c, contratoData, assinatura, onClose, onDelete, onGeneratePDF }) {
  if (!c) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Comprovante de Entrega</h2>
            <p className="text-xs text-gray-500">Contrato {c.contrato}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-lg" translate="no">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && <StatusBadge status="assinado" />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-500 block text-xs">Locatário</span><span className="font-medium">{c.locatario || '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">CPF/CNPJ</span><span className="font-medium" translate="no">{c.cpf || '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">Telefone</span><span className="font-medium">{c.telefoneEntrega || c.telefone || '-'}</span></div>
            <div className="col-span-2 sm:col-span-3"><span className="text-gray-500 block text-xs">Endereço</span><span className="font-medium">{c.endereco || '-'}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}{c.cidade ? ` — ${c.cidade}/${c.estado}` : ''}</span></div>
            <div><span className="text-gray-500 block text-xs">Total</span><span className="font-bold text-green-600 text-base">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          </div>
          {c.itens && c.itens.length > 0 && (
            <div className="overflow-x-auto">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens</h4>
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead><tr className="bg-gray-50 border-b text-gray-500">
                  <th className="text-left py-2 px-3">Qtde</th>
                  <th className="text-left py-2 px-3">Descrição</th>
                  <th className="text-left py-2 px-3 hidden sm:table-cell">Patrimônio</th>
                  <th className="text-right py-2 px-3">Valor</th>
                </tr></thead>
                <tbody>{c.itens.map((it, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3">{it.quantidade || 1}</td>
                    <td className="py-2 px-3">{it.descricao || '-'}</td>
                    <td className="py-2 px-3 hidden sm:table-cell">{it.patrimonio || '-'}</td>
                    <td className="py-2 px-3 text-right">R$ {Number(it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {assinatura && <SignatarioInfo assinatura={assinatura} expanded />}
          {contratoData && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Dados do Contrato</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{contratoData.cliente}</span></div>
                <div><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{contratoData.cnpj || '-'}</span></div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={contratoData.status} /></div>
                <div><span className="text-gray-500">Início:</span> <span className="font-medium">{contratoData.inicio || '-'}</span></div>
                <div><span className="text-gray-500">Fim:</span> <span className="font-medium">{contratoData.fim || '-'}</span></div>
                <div><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium text-green-600">R$ {Number(contratoData.valorMensal || 0).toLocaleString('pt-BR')}/mês</span></div>
                <div className="sm:col-span-3"><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(contratoData.equipamentos) ? contratoData.equipamentos.join(', ') : '-'}</span></div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onGeneratePDF(c)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
            <button onClick={() => { onDelete(c); onClose(); }} className="px-4 py-2.5 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition-colors">
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevolucaoCard({ c, contratoData: _contratoData, assinatura, onDelete, onGeneratePDF, onOpenModal }) {
  const condicoes = c.condicoesDevolucao || c.condicoes || {};
  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onOpenModal}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded" translate="no">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
          <div className="text-xs sm:text-sm text-gray-500 mt-1 space-y-0.5">
            {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
            {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
            {c.nomeSignatario && <p className="text-xs text-orange-600 font-medium">Assinado por: {c.nomeSignatario}</p>}
          </div>
          {c.itens && c.itens.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns) para devolução</p>
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
            <button onClick={(e) => { e.stopPropagation(); onGeneratePDF(c); }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Baixar PDF">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(c); }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {assinatura && <SignatarioInfo assinatura={assinatura} />}
    </div>
  );
}

function DevolucaoModal({ c, contratoData, assinatura, onClose, onDelete, onGeneratePDF }) {
  if (!c) return null;
  const condicoes = c.condicoesDevolucao || c.condicoes || {};
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Devolução de Equipamento</h2>
            <p className="text-xs text-gray-500">Contrato {c.contrato}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono bg-orange-50 text-orange-700 px-3 py-1 rounded-lg" translate="no">{c.contrato}</span>
            <StatusBadge status={c.status} />
            {c.assinado && <StatusBadge status="assinado" />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-500 block text-xs">Locatário</span><span className="font-medium">{c.locatario || '-'}</span></div>
            <div><span className="text-gray-500 block text-xs">CPF/CNPJ</span><span className="font-medium" translate="no">{c.cpf || '-'}</span></div>
            <div className="col-span-2 sm:col-span-3"><span className="text-gray-500 block text-xs">Endereço</span><span className="font-medium">{c.endereco || '-'}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}{c.cidade ? ` — ${c.cidade}/${c.estado}` : ''}</span></div>
          </div>
          {(condicoes.danificado || condicoes.extraviado || condicoes.testarEmpresa) && (
            <div className="flex flex-wrap gap-2">
              {condicoes.danificado && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">Danificado/Sujo</span>}
              {condicoes.extraviado && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">Extraviado</span>}
              {condicoes.testarEmpresa && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">Testar na empresa</span>}
            </div>
          )}
          {c.itens && c.itens.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens para Devolução</h4>
              {c.itens.map((it, i) => (
                <div key={i} className="text-sm flex items-center gap-2 py-1 border-b last:border-0">
                  <span>{it.quantidade || 1}x</span>
                  <span className="font-medium">{it.descricao}</span>
                  <span className="text-gray-400">({it.patrimonio || '-'})</span>
                </div>
              ))}
            </div>
          )}
          {assinatura && <SignatarioInfo assinatura={assinatura} expanded />}
          {contratoData && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Dados do Contrato</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{contratoData.cliente}</span></div>
                <div><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{contratoData.cnpj || '-'}</span></div>
                <div><span className="text-gray-500">Referência:</span> <span className="font-medium">{contratoData.referencia || '-'}</span></div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onGeneratePDF(c)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
            <button onClick={() => { onDelete(c); onClose(); }} className="px-4 py-2.5 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition-colors">
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Documentos() {
  const [activeTab, setActiveTab] = useState('entrega');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalItem, setModalItem] = useState(null);

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const { data: contratos } = useContratos();
  const { data: devolucoes } = useDevolucoes();
  const { data: assinaturas } = useAssinaturas();
  const deleteComprovante = useDeleteComprovante();

  const handleSearch = () => setSearch(searchInput);
  const clearSearch = () => { setSearchInput(''); setSearch(''); };

  const getContrato = (contratoId) => (contratos || []).find((c) => c.id === contratoId);

  const getAssinatura = (comprovanteId) => (assinaturas || []).find((a) => a.comprovanteId === comprovanteId);

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
        const sig = getAssinatura(comprovante.id);
        await generateEntregaPDF({
          ...comprovante,
          signatureImg: sig?.assinaturaImagem,
          signatarioNome: sig?.nomeSignatario,
        });
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
          <p className="text-xs sm:text-sm text-gray-500">{(comprovantes || []).length} comprovantes no total</p>
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
          title={activeTab === 'entrega' ? 'Nenhum comprovante de entrega' : 'Nenhum comprovante de devolução'}
          description={activeTab === 'entrega'
            ? 'Comprovantes de entrega serão criados automaticamente ao criar contratos.'
            : 'Comprovantes de devolução serão criados ao importar PDFs de devolução via novo contrato.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredComprovantes.map((c) => {
            const contratoData = c.contratoId ? getContrato(c.contratoId) : null;
            const assinatura = getAssinatura(c.id);

            if (activeTab === 'entrega') {
              return (
                <EntregaCard
                  key={c.id}
                  c={c}
                  contratoData={contratoData}
                  assinatura={assinatura}
                  onOpenModal={() => setModalItem({ type: 'entrega', c, contratoData, assinatura })}
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
                assinatura={assinatura}
                onOpenModal={() => setModalItem({ type: 'devolucao', c, contratoData, assinatura })}
                onDelete={setDeleteTarget}
                onGeneratePDF={handleGeneratePDF}
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

      {modalItem && modalItem.type === 'entrega' && (
        <ComprovanteModal
          c={modalItem.c}
          contratoData={modalItem.contratoData}
          assinatura={modalItem.assinatura}
          onClose={() => setModalItem(null)}
          onDelete={setDeleteTarget}
          onGeneratePDF={handleGeneratePDF}
        />
      )}
      {modalItem && modalItem.type === 'devolucao' && (
        <DevolucaoModal
          c={modalItem.c}
          contratoData={modalItem.contratoData}
          assinatura={modalItem.assinatura}
          onClose={() => setModalItem(null)}
          onDelete={setDeleteTarget}
          onGeneratePDF={handleGeneratePDF}
        />
      )}
    </div>
  );
}
