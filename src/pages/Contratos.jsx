import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, RotateCcw, FileText, Download, ClipboardCheck, Calendar, MapPin, Wrench, DollarSign, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { detectDocumentType } from '../lib/validation';
import { useContratos, useCreateContrato, useUpdateContrato, useDeleteContrato } from '../hooks/useContratos';
import { useComprovantes, useCreateComprovante } from '../hooks/useComprovantes';
import { getEmailHeaders } from '../lib/supabase';
import ContratoModal from '../components/contratos/ContratoModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import { generateContratoPDF } from '../lib/pdfExport';
import { useAssinaturas } from '../hooks/useAssinaturas';
import { formatDateBR } from '../lib/dates';

export default function Contratos() {
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCt, setEditingCt] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: allCtList, isLoading, isError, error, refetch } = useContratos(filters);
  const { data: comprovantes } = useComprovantes();
  const { data: allAssinaturas } = useAssinaturas();

  const getEffectiveStatus = (c) => {
    if (c.status === 'cancelado') return 'cancelado';
    if (c.status === 'entregue') return 'entregue';
    const dias = c.vencimentoDias;
    if (dias != null && dias <= 0) return 'vencido';
    if (dias != null && dias <= 30) return 'vencendo';
    return 'ativo';
  };

  const ctList = useMemo(() => {
    if (!allCtList) return [];
    if (!filters.status || filters.status === 'all') return allCtList;
    return allCtList.filter((c) => getEffectiveStatus(c) === filters.status);
  }, [allCtList, filters.status]);
  const createCt = useCreateContrato();
  const updateCt = useUpdateContrato();
  const deleteCt = useDeleteContrato();
  const createComp = useCreateComprovante();

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

    await updateCt.mutateAsync({
      id: renewTarget.id,
      updates: {
        ...data,
        status: 'ativo',
        assinado: false,
      },
    });

    const itens = (data.itens || renewTarget.itens || []).map(it => ({
      quantidade: it.quantidade || 1,
      descricao: it.descricao || '',
      patrimonio: it.patrimonio || '',
      dataLocacao: data.inicio || renewTarget.inicio || '',
      dataDevolucao: data.fim || renewTarget.fim || '',
      valorUnitario: it.valorUnitario || 0,
    }));

    await createComp.mutateAsync({
      contratoId: renewTarget.id,
      contrato: renewTarget.numero || renewTarget.cliente || String(renewTarget.id),
      atendente: renewTarget.atendente || '',
      locatario: renewTarget.cliente || '',
      cpf: renewTarget.cnpj || '',
      rg: renewTarget.rg || '',
      telefone: renewTarget.telefone || '',
      contato: renewTarget.contato || '',
      endereco: renewTarget.endereco || '',
      numero: renewTarget.numeroEndereco || '',
      bairro: renewTarget.bairro || '',
      cidade: renewTarget.cidade || '',
      estado: renewTarget.estado || '',
      cep: renewTarget.cep || '',
      localEntrega: renewTarget.localEntrega || '',
      telefoneEntrega: renewTarget.telefoneEntrega || '',
      data: data.inicio || new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().slice(0, 5),
      itens,
      total: data.valorTotal || renewTarget.valorTotal || 0,
      status: 'pendente',
      assinado: false,
      tipoDocumento: 'entrega',
    });

    toast.success('Contrato renovado! Novo comprovante criado para assinatura.');

    const emailBody = {
      tipo: 'contrato_renovado',
      contrato_id: renewTarget.id,
      destinatario: '',
      contrato: {
        id: renewTarget.id,
        numero: renewTarget.numero,
        cliente: renewTarget.cliente,
        cnpj: renewTarget.cnpj || '',
        rg: renewTarget.rg || '',
        telefone: renewTarget.telefone || '',
        atendente: renewTarget.atendente || '',
        equipamentos: renewTarget.equipamentos || [],
        inicio: data.inicio || renewTarget.inicio || '',
        fim: data.fim || renewTarget.fim || '',
        valorMensal: data.valorMensal || renewTarget.valorMensal || 0,
        valorTotal: data.valorTotal || renewTarget.valorTotal || 0,
        localEntrega: renewTarget.localEntrega || '',
        endereco: renewTarget.endereco || '',
        numero_endereco: renewTarget.numeroEndereco || '',
        bairro: renewTarget.bairro || '',
        cidade: renewTarget.cidade || '',
        estado: renewTarget.estado || '',
        cep: renewTarget.cep || '',
      },
    };
    fetch('/api/email/send', {
      method: 'POST',
      headers: await getEmailHeaders(),
      body: JSON.stringify(emailBody),
    }).catch(() => {});

    try {
      await refetch();
    } catch { /* non-blocking */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCt.mutateAsync(deleteTarget.id);
    toast.success('Contrato excluido!');
    setDeleteTarget(null);
  };

  const handleExportPDF = async (ct) => {
    try {
      const comp = (comprovantes || []).find(c => c.contratoId === ct.id);
      const assinatura = comp ? (allAssinaturas || []).find(a => a.comprovanteId === comp.id) : null;
      const ctWithPhotos = {
        ...ct,
        ...(assinatura ? {
          fotosEntrega: assinatura.fotosEntrega || assinatura.fotos_entrega || [],
          fotosRetirada: assinatura.fotosRetirada || assinatura.fotos_retirada || [],
          signatureImg: assinatura.assinaturaImagem || assinatura.assinatura_imagem || '',
          signatarioNome: assinatura.nomeSignatario || assinatura.nome_signatario || '',
          dataAssinatura: assinatura.dataAssinatura || assinatura.data_assinatura || '',
        } : {}),
      };
      await generateContratoPDF(ctWithPhotos);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const stats = {
    total: ctList.length,
    ativos: ctList.filter((c) => getEffectiveStatus(c) === 'ativo').length,
    vencendo: ctList.filter((c) => getEffectiveStatus(c) === 'vencendo').length,
    vencidos: ctList.filter((c) => getEffectiveStatus(c) === 'vencido').length,
    entregues: ctList.filter((c) => getEffectiveStatus(c) === 'entregue').length,
    cancelados: ctList.filter((c) => getEffectiveStatus(c) === 'cancelado').length,
  };

  if (isLoading) return <div className="p-4 md:p-6"><CardSkeleton count={6} /></div>;
  if (isError) return <div className="p-4 md:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Contratos</h2>
          <p className="text-xs md:text-sm text-gray-500">{stats.total} contratos cadastrados</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 px-1">
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
            const showEntregueBadge = isEntregue && ct.status !== 'entregue';
            return (
              <div key={ct.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEditingCt(ct)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] md:text-xs font-mono text-gray-400">{ct.id}</p>
                      <StatusBadge status={ct.status} />
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        ct.tipoDocumento === 'devolucao' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ct.tipoDocumento === 'devolucao' ? <RotateCcw className="w-2.5 h-2.5" /> : <ClipboardCheck className="w-2.5 h-2.5" />}
                        {ct.tipoDocumento === 'devolucao' ? 'Devolução' : 'Entrega'}
                      </span>
                      {showEntregueBadge && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                          <ClipboardCheck className="w-2.5 h-2.5" /> Entregue
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm md:text-base mt-1 truncate">{ct.cliente}</h3>
                    {ct.cnpj && <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{detectDocumentType(ct.cnpj) === 'cpf' ? 'CPF' : 'CNPJ'}: {ct.cnpj}</p>}
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

                {(() => {
                  const comp = (comprovantes || []).find(c => (c.contratoId || c.contrato_id) === ct.id);
                  const assinatura = comp ? (allAssinaturas || []).find(a => (a.comprovanteId || a.comprovante_id) === comp.id) : null;
                  if (!assinatura) return null;
                  return (
                    <div className="mt-3 pt-3 border-t bg-green-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-green-800">Assinado Digitalmente</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Recebedor:</span>
                          <span className="font-medium block truncate">{assinatura.nomeSignatario || assinatura.nome_signatario}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPF/CNPJ:</span>
                          <span className="font-medium block" translate="no">{assinatura.cpfSignatario || assinatura.cpf_signatario || '-'}</span>
                        </div>
                      </div>
                      {assinatura.dataAssinatura && (
                        <p className="text-xs text-gray-400">{formatDateBR(assinatura.dataAssinatura || assinatura.data_assinatura)}</p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row gap-1.5 pt-3 border-t border-gray-100">
                  <button onClick={(e) => { e.stopPropagation(); handleExportPDF(ct); }}
                    className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Gerar PDF">
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setRenewTarget(ct); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Renovar</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(ct); }}
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
