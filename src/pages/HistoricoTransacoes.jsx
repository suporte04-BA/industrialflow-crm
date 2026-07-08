import { useState, useMemo, Fragment } from 'react';
import { FileText, PenLine, Package, ClipboardList, Building2, Search, X, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useContratos } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import { useAssinaturas } from '../hooks/useAssinaturas';
import { useOrdensServico } from '../hooks/useOrdensServico';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { formatDateBR, parseDate } from '../lib/dates';
import { generateContratoPDF, generateEntregaPDF, generateDevolucaoPDF } from '../lib/pdfExport';

const tipoIcons = {
  contrato: FileText,
  comprovante: ClipboardList,
  assinatura: PenLine,
  os: Package,
  equipamento: Building2,
};

const tipoColors = {
  contrato: 'bg-blue-100 text-blue-700',
  comprovante: 'bg-green-100 text-green-700',
  assinatura: 'bg-purple-100 text-purple-700',
  os: 'bg-orange-100 text-orange-700',
  equipamento: 'bg-gray-100 text-gray-700',
};

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-xs text-gray-900 font-medium text-right max-w-[60%]">{value || '-'}</span>
    </div>
  );
}

function HistoricoDetailModal({ item, isOpen, onClose, onDownloadPDF }) {
  if (!isOpen || !item) return null;

  const Icon = tipoIcons[item.tipo] || FileText;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoColors[item.tipo]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">{item.titulo}</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.tipo}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Dados Gerais</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <DetailRow label="Tipo" value={item.tipo === 'os' ? 'OS' : item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)} />
                <DetailRow label="Status" value={<StatusBadge status={item.status} />} />
                <DetailRow label="Data" value={item.data && item.data !== '-' ? formatDateBR(item.data) : '-'} />
                <DetailRow label="Valor" value={item.valor ? `R$ ${Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} />
              </div>
            </div>

            {item.descricao && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Descricao</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-700">{item.descricao}</p>
                </div>
              </div>
            )}

            {item.detalhes && Object.keys(item.detalhes).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Detalhes</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {Object.entries(item.detalhes).map(([key, value]) => (
                    <DetailRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex flex-col sm:flex-row gap-2 shrink-0">
            <button onClick={() => onDownloadPDF(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-yellow-400 text-gray-900 rounded-lg font-medium text-sm hover:bg-yellow-300 transition-colors">
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
            <button onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function HistoricoTransacoes() {
  const [filtro, setFiltro] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [modalItem, setModalItem] = useState(null);

  const handleSearch = () => setSearchTerm(searchInput);
  const clearSearch = () => { setSearchInput(''); setSearchTerm(''); };

  const { data: contratos, isLoading: l1, isError: e1, error: err1, refetch: r1 } = useContratos();
  const { data: comprovantes, isLoading: l2 } = useComprovantes();
  const { data: assinaturas, isLoading: l3 } = useAssinaturas();
  const { data: ordens, isLoading: l4 } = useOrdensServico();

  const isLoading = l1 || l2 || l3 || l4;
  const isError = e1;
  const error = err1;
  const refetch = r1;

  const allTransactions = useMemo(() => {
    const items = [];

    (contratos || []).forEach((ct) => {
      items.push({
        id: ct.id,
        tipo: 'contrato',
        titulo: `Contrato ${ct.numero || ct.id} - ${ct.cliente}`,
        descricao: `${Array.isArray(ct.equipamentos) ? ct.equipamentos.join(', ') : ct.equipamentos || '-'} | R$ ${Number(ct.valorTotal || 0).toLocaleString('pt-BR')}`,
        status: ct.status,
        data: ct.createdAt || ct.dataContrato || '-',
        valor: ct.valorTotal,
        detalhes: {
          cliente: ct.cliente,
          cpf_cnpj: ct.cnpj || '-',
          atendente: ct.atendente || '-',
          periodo: ct.inicio && ct.fim ? `${ct.inicio} a ${ct.fim}` : '-',
          localEntrega: ct.localEntrega || '-',
          cidade: ct.cidade ? `${ct.cidade}/${ct.estado || ''}` : '-',
        },
      });
    });

    (comprovantes || []).forEach((cp) => {
      items.push({
        id: cp.id,
        tipo: 'comprovante',
        titulo: `Comprovante ${cp.contrato} - ${cp.locatario}`,
        descricao: `${cp.cidade || '-'} | R$ ${Number(cp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        status: cp.status,
        data: cp.createdAt || '-',
        valor: cp.total,
        detalhes: {
          locatario: cp.locatario,
          cpf: cp.cpf || '-',
          endereco: cp.endereco || '-',
          localEntrega: cp.localEntrega || '-',
          itens: cp.itens ? `${cp.itens.length} item(ns)` : '0',
        },
      });
    });

    (assinaturas || []).forEach((as) => {
      items.push({
        id: as.id,
        tipo: 'assinatura',
        titulo: `Assinatura - ${as.nomeSignatario}`,
        descricao: `CPF: ${as.cpfSignatario || '-'}`,
        status: 'assinado',
        data: as.dataAssinatura || as.createdAt || '-',
        valor: 0,
        detalhes: {
          nome: as.nomeSignatario,
          cpf: as.cpfSignatario || '-',
          comprovanteId: as.comprovanteId || '-',
        },
      });
    });

    (ordens || []).forEach((os) => {
      items.push({
        id: os.id,
        tipo: 'os',
        titulo: `OS ${os.id} - ${os.cliente}`,
        descricao: `${os.tipo} | ${os.equipamento}`,
        status: os.status,
        data: os.abertura || '-',
        valor: os.valor,
        detalhes: {
          cliente: os.cliente,
          tecnico: os.tecnico || '-',
          equipamento: os.equipamento || '-',
          prioridade: os.prioridade || '-',
          tipo: os.tipo || '-',
        },
      });
    });

    return items.sort((a, b) => {
      const da = parseDate(a.data) || new Date(0);
      const db = parseDate(b.data) || new Date(0);
      return db - da;
    });
  }, [contratos, comprovantes, assinaturas, ordens]);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (filtro !== 'all' && t.tipo !== filtro) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          t.titulo.toLowerCase().includes(term) ||
          t.descricao.toLowerCase().includes(term) ||
          t.id.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allTransactions, filtro, searchTerm]);

  const stats = useMemo(() => ({
    total: allTransactions.length,
    contratos: allTransactions.filter((t) => t.tipo === 'contrato').length,
    comprovantes: allTransactions.filter((t) => t.tipo === 'comprovante').length,
    assinaturas: allTransactions.filter((t) => t.tipo === 'assinatura').length,
    ordens: allTransactions.filter((t) => t.tipo === 'os').length,
  }), [allTransactions]);

  const handleDownloadPDF = async (item) => {
    try {
      switch (item.tipo) {
        case 'contrato': {
          const ct = (contratos || []).find(c => c.id === item.id);
          if (ct) await generateContratoPDF(ct);
          else toast.error('Contrato nao encontrado');
          break;
        }
        case 'comprovante': {
          const cp = (comprovantes || []).find(c => c.id === item.id);
          if (cp?.tipoDocumento === 'devolucao') {
            await generateDevolucaoPDF(cp);
          } else if (cp) {
            await generateEntregaPDF(cp);
          } else {
            toast.error('Comprovante nao encontrado');
          }
          break;
        }
        case 'assinatura': {
          const as = (assinaturas || []).find(a => a.id === item.id);
          const cp = as ? (comprovantes || []).find(c => c.id === as.comprovanteId) : null;
          if (cp) {
            await generateEntregaPDF({ ...cp, signatureImg: as.assinaturaImagem, signatarioNome: as.nomeSignatario });
          } else {
            toast.error('Comprovante associado nao encontrado');
          }
          break;
        }
        default:
          toast.error('PDF nao disponivel para este tipo');
          return;
      }
      toast.success('PDF gerado com sucesso!');
      setModalItem(null);
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  if (isLoading) return <div className="p-4 md:p-6"><TableSkeleton rows={10} cols={5} /></div>;
  if (isError) return <div className="p-4 md:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 md:space-y-6 px-3 sm:px-0 pb-20">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Historico de Transacoes</h2>
        <p className="text-xs sm:text-sm text-gray-500">{stats.total} transacoes registradas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Contratos', value: stats.contratos, color: 'bg-blue-100 text-blue-700' },
          { label: 'Comprovantes', value: stats.comprovantes, color: 'bg-green-100 text-green-700' },
          { label: 'Assinaturas', value: stats.assinaturas, color: 'bg-purple-100 text-purple-700' },
          { label: 'OS', value: stats.ordens, color: 'bg-orange-100 text-orange-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-2.5 sm:p-3 ${s.color}`}>
            <p className="text-lg sm:text-xl font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs opacity-80">{s.label}</p>
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
          {['all', 'contrato', 'comprovante', 'assinatura', 'os'].map((t) => (
            <button key={t} onClick={() => setFiltro(t)}
              className={`px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                filtro === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-3 sm:px-4 py-3 font-medium w-8"></th>
                <th className="px-3 sm:px-4 py-3 font-medium">Tipo</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Descricao</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden sm:table-cell">Detalhes</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Status</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="px-3 sm:px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-3 sm:px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma transacao encontrada</td></tr>
              ) : (
                filtered.map((t) => {
                  const Icon = tipoIcons[t.tipo] || FileText;
                  const isExpanded = expandedId === `${t.tipo}-${t.id}`;
                  return (
                    <Fragment key={`${t.tipo}-${t.id}`}>
                      <tr className={`border-b last:border-0 transition-colors cursor-pointer ${isExpanded ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setExpandedId(isExpanded ? null : `${t.tipo}-${t.id}`)}>
                        <td className="px-3 sm:px-4 py-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${tipoColors[t.tipo]}`}>
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{t.tipo === 'os' ? 'OS' : t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}</span>
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 text-xs sm:text-sm">{t.titulo}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate hidden sm:table-cell">{t.descricao}</td>
                        <td className="px-3 sm:px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{t.data && t.data !== '-' ? formatDateBR(t.data) : '-'}</td>
                        <td className="px-3 sm:px-4 py-3 text-right font-medium text-xs sm:text-sm">{t.valor ? `R$ ${Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                        <td className="px-3 sm:px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); setModalItem(t); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Ver detalhes">
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="bg-gray-50 px-4 sm:px-8 py-3 border-b">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {Object.entries(t.detalhes || {}).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-gray-400">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                                    <span className="font-medium text-gray-700 ml-1">{value || '-'}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setModalItem(t); }}
                                  className="text-xs text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Ver detalhes
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(t); }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                  <Download className="w-3 h-3" /> Baixar PDF
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HistoricoDetailModal
        item={modalItem}
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
}

