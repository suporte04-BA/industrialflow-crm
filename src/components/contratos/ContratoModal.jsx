import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Plus, Trash2, FileUp, FileDown, CheckCircle, ArrowLeft, AlertTriangle, Calendar, MapPin, User, FileText, Package, Wrench, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../ui/Button';
import PdfImportButton from '../common/PdfImportButton';
import { isValidCPF, isValidCNPJ, formatCPFCNPJ, detectDocumentType, isValidCEP, formatCEP } from '../../lib/validation';

const emptyItem = { quantidade: 1, descricao: '', patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 };
const emptyCondicoes = { danificado: false, extraviado: false, testarEmpresa: false };

function calcMonths(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
  const daysDiff = e.getDate() > s.getDate() ? 1 : 0;
  return Math.max(1, months + (daysDiff > 0 ? 1 : 0));
}

function getInitialForm(contrato, isRenew) {
  if (contrato) {
    return {
      cliente: contrato.cliente || '',
      cnpj: contrato.cnpj || '',
      equipamentos: Array.isArray(contrato.equipamentos) ? contrato.equipamentos : [contrato.equipamentos || ''],
      numero: contrato.numero || '',
      dataContrato: contrato.dataContrato || '',
      horaContrato: contrato.horaContrato || '',
      atendente: contrato.atendente || '',
      referencia: contrato.referencia || '',
      inicio: isRenew ? new Date().toISOString().split('T')[0] : (contrato.inicio || ''),
      fim: isRenew ? '' : (contrato.fim || ''),
      valorTotal: isRenew ? '' : (contrato.valorTotal != null ? contrato.valorTotal : ''),
      valorMensal: contrato.valorMensal != null ? contrato.valorMensal : '',
      status: isRenew ? 'ativo' : (contrato.status || 'ativo'),
      assinado: isRenew ? false : (contrato.assinado || false),
      endereco: contrato.endereco || '',
      numeroEndereco: contrato.numeroEndereco || '',
      bairro: contrato.bairro || '',
      cidade: contrato.cidade || '',
      estado: contrato.estado || '',
      cep: contrato.cep || '',
      contato: contrato.contato || '',
      rg: contrato.rg || '',
      telefone: contrato.telefone || '',
      localEntrega: contrato.localEntrega || '',
      telefoneEntrega: contrato.telefoneEntrega || '',
      itens: Array.isArray(contrato.itens) && contrato.itens.length > 0
        ? contrato.itens.map(it => ({ ...emptyItem, ...it }))
        : [{ ...emptyItem }],
      observacao: contrato.observacao || '',
      tipoDocumento: contrato.tipoDocumento || 'entrega',
      condicoesDevolucao: contrato.condicoesDevolucao || { ...emptyCondicoes },
    };
  }
  const now = new Date();
  return {
    cliente: '', cnpj: '', equipamentos: [''],
    numero: '', dataContrato: now.toISOString().split('T')[0], horaContrato: now.toTimeString().slice(0, 5), atendente: '',
    referencia: '',
    inicio: '', fim: '', valorTotal: '', valorMensal: '',
    status: 'ativo', assinado: false,
    endereco: '', numeroEndereco: '', bairro: '', cidade: '', estado: '', cep: '',
    contato: '',
    rg: '', telefone: '',
    localEntrega: '', telefoneEntrega: '',
    itens: [{ ...emptyItem }],
    observacao: '',
    tipoDocumento: 'entrega',
    condicoesDevolucao: { ...emptyCondicoes },
  };
}


export default function ContratoModal({ isOpen, onClose, onSave, contrato = null, isRenew = false }) {
  const isEdit = !!contrato && !isRenew;
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importedTipo, setImportedTipo] = useState(null);
  const [form, setForm] = useState(() => getInitialForm(contrato, isRenew));
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [openSections, setOpenSections] = useState({ itens: true, equipamentos: true });
  const prevContratoIdRef = useRef(contrato?.id || (isRenew ? 'renew' : contrato ? 'edit' : 'new'));

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const contratoId = contrato?.id || (isRenew ? 'renew' : contrato ? 'edit' : 'new');
    if (contratoId !== prevContratoIdRef.current) {
      prevContratoIdRef.current = contratoId;
      setForm({ ...getInitialForm(contrato, isRenew), _contratoId: contratoId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato?.id, isRenew]);

  const addEquipamento = () => setForm(prev => ({ ...prev, equipamentos: [...prev.equipamentos, ''] }));
  const removeEquipamento = (idx) => setForm(prev => ({ ...prev, equipamentos: prev.equipamentos.filter((_, i) => i !== idx) }));
  const updateEquipamento = (idx, val) => {
    setForm(prev => {
      const updated = [...prev.equipamentos];
      updated[idx] = val;
      return { ...prev, equipamentos: updated };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, itens: [...prev.itens, { ...emptyItem }] }));
  const removeItem = (idx) => setForm(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, val) => {
    setForm(prev => {
      const updated = [...prev.itens];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, itens: updated };
    });
  };

  const total = useMemo(() => {
    const itensTotal = form.itens.reduce((sum, it) => {
      const qty = Number(it.quantidade) || 0;
      const price = Number(it.valorUnitario) || 0;
      return sum + (qty * price);
    }, 0);
    if (itensTotal > 0) return itensTotal;
    if (form.inicio && form.fim && form.valorMensal) {
      return calcMonths(form.inicio, form.fim) * Number(form.valorMensal);
    }
    return Number(form.valorTotal) || 0;
  }, [form.itens, form.inicio, form.fim, form.valorMensal, form.valorTotal]);

  const handlePdfImport = (fields) => {
    const importedItems = Array.isArray(fields.itens) && fields.itens.length > 0
      ? fields.itens.map(it => ({
          quantidade: it.quantidade || 1,
          descricao: it.descricao || '',
          patrimonio: it.patrimonio || '',
          dataLocacao: it.data_locacao || '',
          dataDevolucao: it.data_devolucao || '',
          valorUnitario: it.valor_unitario || 0,
        }))
      : undefined;

    const importedEquipamentos = Array.isArray(fields.equipamentos) && fields.equipamentos.length > 0
      ? fields.equipamentos.filter(e => {
          if (!e || e.trim().length < 3) return false;
          const lower = e.toLowerCase();
          if (lower.includes('local da entrega') || lower.includes('local de entrega')) return false;
          if (lower.includes('avenida') || lower.includes('rua') || lower.includes('av.')) return false;
          if (lower.includes('bairro') || lower.includes('manaus') || lower.includes('cep:')) return false;
          if (/^\d{5}-?\d{3}/.test(e.trim())) return false;
          return true;
        })
      : undefined;

    if (fields.tipo_documento) {
      setImportedTipo(fields.tipo_documento);
    }

    let cnpjVal = (fields.cpf_cnpj || '').replace(/^[\s/]+/, '').trim();
    const detectedType = detectDocumentType(cnpjVal);
    if (detectedType === 'cpf' && !isValidCPF(cnpjVal)) {
      toast.warning('CPF importado invalido, verifique manualmente');
    } else if (detectedType === 'cnpj' && !isValidCNPJ(cnpjVal)) {
      toast.warning('CNPJ importado invalido, verifique manualmente');
    }

    const buildFullAddress = (f) => {
      const parts = [];
      if (f.endereco) parts.push(f.endereco + (f.numero ? `, ${f.numero}` : ''));
      if (f.bairro) parts.push(f.bairro);
      if (f.referencia) parts.push(f.referencia);
      if (f.cidade) parts.push(f.cidade + (f.estado ? `/${f.estado}` : ''));
      if (f.cep) parts.push(`CEP: ${f.cep}`);
      return parts.join(' - ');
    };

    const mappedContato = (fields.contato_cliente || fields.contato || '').replace(/refer[eê]ncia.*$/i, '').trim();

    const valorMensalCalc = (() => {
      if (fields.valores?.total && fields.valores.total > 0 && importedItems && importedItems.length > 0) {
        const itensTotal = importedItems.reduce((s, it) => s + (Number(it.quantidade || 1) * Number(it.valorUnitario || 0)), 0);
        if (itensTotal > 0) return itensTotal;
      }
      if (fields.valores?.total && fields.valores.total > 0) return fields.valores.total;
      return undefined;
    })();

    setForm((prev) => ({
      ...prev,
      cliente: fields.locatario || fields.contato || fields.cliente || prev.cliente,
      cnpj: cnpjVal || prev.cnpj,
      endereco: fields.endereco || prev.endereco,
      numeroEndereco: fields.numero || prev.numeroEndereco,
      bairro: fields.bairro || prev.bairro,
      cidade: fields.cidade || prev.cidade,
      estado: fields.estado || prev.estado,
      cep: fields.cep || prev.cep,
      contato: mappedContato,
      rg: fields.rg || prev.rg,
      telefone: fields.telefone || prev.telefone,
      atendente: fields.atendente || prev.atendente,
      horaContrato: fields.hora || prev.horaContrato,
      localEntrega: fields.local_entrega || buildFullAddress(fields) || prev.localEntrega,
      telefoneEntrega: fields.telefone_entrega || prev.telefoneEntrega,
      observacao: fields.observacao || prev.observacao,
      numero: fields.numero_pedido || prev.numero,
      inicio: fields.data_retirada || prev.inicio,
      fim: fields.data_devolucao || prev.fim,
      referencia: fields.referencia || prev.referencia,
      itens: importedItems || prev.itens,
      equipamentos: importedEquipamentos || prev.equipamentos,
      valorMensal: valorMensalCalc || prev.valorMensal,
      valorTotal: fields.valores?.total || prev.valorTotal,
      tipoDocumento: fields.tipo_documento || prev.tipoDocumento,
      condicoesDevolucao: { ...emptyCondicoes },
    }));
    setShowImport(false);

    const count = (fields.itens?.length || 0) + (fields.equipamentos?.length || 0);
    const tipoLabel = fields.tipo_documento === 'devolucao' ? 'Devolução' : 'Entrega';
    toast.success(count > 0 ? `${count} campo(s) importado(s) do PDF (${tipoLabel})!` : `Dados importados do PDF (${tipoLabel})!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dataContrato) { toast.error('Preencha a data do contrato'); return; }
    if (!form.atendente.trim()) { toast.error('Preencha o atendente'); return; }
    if (!form.cliente.trim()) { toast.error('Preencha o nome do locatário'); return; }
    if (!form.cnpj.trim()) { toast.error('Preencha o CPF/CNPJ'); return; }
    const docType = detectDocumentType(form.cnpj);
    if (docType === 'cpf' && !isValidCPF(form.cnpj)) { toast.error('CPF inválido'); return; }
    if (docType === 'cnpj' && !isValidCNPJ(form.cnpj)) { toast.error('CNPJ inválido'); return; }
    if (!form.contato.trim()) { toast.error('Preencha o contato'); return; }
    if (!form.endereco.trim()) { toast.error('Preencha o endereço'); return; }
    if (!form.numeroEndereco.trim()) { toast.error('Preencha o número do endereço'); return; }
    if (!form.bairro.trim()) { toast.error('Preencha o bairro'); return; }
    if (!form.cidade.trim()) { toast.error('Preencha a cidade'); return; }
    if (!form.estado.trim()) { toast.error('Preencha o estado'); return; }
    if (!form.cep.trim()) { toast.error('Preencha o CEP'); return; }
    if (!isValidCEP(form.cep)) { toast.error('CEP invalido (use 8 digitos: XXXXX-XXX)'); return; }
    if (!form.localEntrega.trim()) { toast.error('Preencha o local de entrega'); return; }
    if (!form.telefoneEntrega.trim()) { toast.error('Preencha o telefone do local de entrega'); return; }
    if (!form.inicio) { toast.error('Preencha a data de início'); return; }
    if (!form.fim) { toast.error('Preencha a data de término'); return; }
    if (form.inicio && form.fim && new Date(form.inicio) > new Date(form.fim)) {
      toast.error('A data de início deve ser anterior à data de término'); return;
    }
    if (form.tipoDocumento !== 'devolucao' && (!form.valorMensal || Number(form.valorMensal) <= 0)) { toast.error('Preencha o valor mensal'); return; }

    const hasValidEquipamento = form.equipamentos.some(e => e.trim());
    if (!hasValidEquipamento) { toast.error('Adicione pelo menos um equipamento'); return; }

    const hasValidItem = form.itens.some(it => it.descricao.trim());
    if (!hasValidItem) { toast.error('Adicione pelo menos um item com descricao'); return; }

    const c = form.condicoesDevolucao || {};
    if (form.tipoDocumento === 'devolucao' && !c.danificado && !c.extraviado && !c.testarEmpresa) {
      toast.error('Selecione pelo menos uma condicao de devolucao (Danificado/Extraviado/Testar Empresa)');
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { _contratoId, ...saveData } = form;
      const data = {
        ...saveData,
        equipamentos: form.equipamentos.filter(Boolean),
        itens: form.itens.filter(it => it.descricao.trim()),
        valorTotal: Number(total) || 0,
        valorMensal: Number(form.valorMensal) || 0,
        rg: form.rg || '',
        telefone: form.telefone || '',
        tipoDocumento: form.tipoDocumento || 'entrega',
        condicoesDevolucao: form.condicoesDevolucao || { ...emptyCondicoes },
        referencia: form.referencia || '',
      };
      setPendingData(data);
      setShowConfirm(true);
    } catch (err) {
      toast.error('Erro ao preparar dados: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingData) return;
    setSaving(true);
    try {
      await onSave(pendingData);
      setShowConfirm(false);
      setPendingData(null);
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleBackToForm = () => {
    setShowConfirm(false);
    setPendingData(null);
  };

  return (
    <AnimatePresence>
       {isOpen && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
           className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
             className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
               <h2 className="text-lg font-bold text-gray-900">
                 {isRenew ? 'Renovar Contrato' : isEdit ? 'Editar Contrato' : 'Novo Contrato'}
               </h2>
               <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Fechar"><X className="w-4 h-4" /></button>
             </div>


            {!isEdit && !isRenew && !showConfirm && (
              <div className="px-6 pt-4">
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, tipoDocumento: 'entrega' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                      form.tipoDocumento === 'entrega'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>
                    Entrega
                  </button>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, tipoDocumento: 'devolucao' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                      form.tipoDocumento === 'devolucao'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                    }`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Devolução
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="secondary" size="sm" icon={showImport ? FileDown : FileUp} onClick={() => setShowImport(!showImport)}>
                    {showImport ? 'Fechar Import' : 'Importar PDF do Pedido'}
                  </Button>
                </div>
                {showImport && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
                    <p className="text-sm text-gray-600 mb-3">Importe um PDF de comprovante de entrega ou devolução:</p>
                    {importedTipo && (
                      <div className={`mb-3 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                        importedTipo === 'devolucao' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: importedTipo === 'devolucao' ? '#f97316' : '#3b82f6' }} />
                        {importedTipo === 'devolucao' ? 'Comprovante de Devolução detectado' : 'Comprovante de Entrega detectado'}
                      </div>
                    )}
                    <PdfImportButton onFieldsExtracted={handlePdfImport} />
                  </div>
                )}
              </div>
            )}

            {showConfirm ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <AlertTriangle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Confirmar Cadastro</h3>
                    <p className="text-xs text-gray-500">Verifique os dados antes de cadastrar</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-800">Dados do Contrato</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">N:</span> <span className="font-medium">{form.numero || 'Auto-gerado'}</span></div>
                    <div><span className="text-gray-500">Tipo:</span> <span className={`font-medium ${form.tipoDocumento === 'devolucao' ? 'text-orange-600' : 'text-blue-600'}`}>{form.tipoDocumento === 'devolucao' ? 'Devolucao' : 'Entrega'}</span></div>
                    <div><span className="text-gray-500">Data:</span> <span className="font-medium">{form.dataContrato ? new Date(form.dataContrato + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span></div>
                    <div><span className="text-gray-500">Hora:</span> <span className="font-medium">{form.horaContrato || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Atendente:</span> <span className="font-medium">{form.atendente || '-'}</span></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-bold text-gray-800">Locatario</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2"><span className="text-gray-500">Nome:</span> <span className="font-medium">{form.cliente || '-'}</span></div>
                    <div><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{form.cnpj || '-'}</span></div>
                    {form.rg && <div><span className="text-gray-500">RG:</span> <span className="font-medium">{form.rg}</span></div>}
                    {form.telefone && <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{form.telefone}</span></div>}
                    <div className="col-span-2"><span className="text-gray-500">Contato:</span> <span className="font-medium">{form.contato || '-'}</span></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-bold text-gray-800">Endereco</h4>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{form.endereco || '-'}, {form.numeroEndereco || '-'}</p>
                    <p>{form.bairro || '-'} - {form.cidade || '-'}/{form.estado || '-'}</p>
                    <p>CEP: {form.cep || '-'}</p>
                    {form.referencia && <p className="text-gray-500">Ref: {form.referencia}</p>}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-yellow-600" />
                    <h4 className="text-sm font-bold text-yellow-800">Local de Entrega</h4>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{form.localEntrega || '-'}</p>
                    <p>Telefone: {form.telefoneEntrega || '-'}</p>
                  </div>
                </div>

                {form.tipoDocumento === 'devolucao' && (
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <h4 className="text-sm font-bold text-orange-800 mb-2">Condicoes de Devolucao</h4>
                    <div className="flex flex-wrap gap-2">
                      {form.condicoesDevolucao?.danificado && <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">Danificado</span>}
                      {form.condicoesDevolucao?.extraviado && <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">Extraviado</span>}
                      {form.condicoesDevolucao?.testarEmpresa && <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">Testar Empresa</span>}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-bold text-green-800">Itens Locados ({form.itens.filter(it => it.descricao.trim()).length})</h4>
                  </div>
                  <div className="space-y-1">
                    {form.itens.filter(it => it.descricao.trim()).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.quantidade}x {item.descricao}</span>
                        <span className="font-medium">R$ {((Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200 text-right">
                    <span className="text-sm font-bold text-green-800">Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-bold text-gray-800">Equipamentos</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.equipamentos.filter(e => e.trim()).map((eq, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">{eq}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-bold text-gray-800">Periodo</h4>
                  </div>
                  <div className="text-sm">
                    <p><span className="text-gray-500">Inicio:</span> <span className="font-medium">{form.inicio ? new Date(form.inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span></p>
                    <p><span className="text-gray-500">Fim:</span> <span className="font-medium">{form.fim ? new Date(form.fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span></p>
                  </div>
                </div>

                {form.tipoDocumento !== 'devolucao' && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-purple-800">Valores</h4>
                    </div>
                    <div className="text-sm">
                      <p><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium">R$ {Number(form.valorMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      <p><span className="text-gray-500">Valor Total:</span> <span className="font-medium">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                    </div>
                  </div>
                )}

                {form.observacao && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-800 mb-1">Observacoes</h4>
                    <p className="text-sm text-gray-600">{form.observacao}</p>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="secondary" type="button" onClick={handleBackToForm} icon={ArrowLeft}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleConfirmSave} icon={saving ? Loader2 : CheckCircle} disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white">
                    {saving ? 'Salvando...' : 'Confirmar Cadastro'}
                  </Button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-sm font-bold text-blue-800 mb-3">Dados do Contrato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contrato Nº</label>
                    <input type="text" value={form.numero || 'Auto-gerado'} readOnly
                      className="input-base bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data (DD/MM/AAAA)</label>
                    <input type="date" value={form.dataContrato} onChange={(e) => setForm(prev => ({ ...prev, dataContrato: e.target.value }))}
                      className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hora (HH:MM)</label>
                    <input type="time" value={form.horaContrato} onChange={(e) => setForm(prev => ({ ...prev, horaContrato: e.target.value }))}
                      className="input-base" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Atendente *</label>
                  <input type="text" value={form.atendente} onChange={(e) => setForm(prev => ({ ...prev, atendente: e.target.value }))}
                    className="input-base" placeholder="Nome do atendente" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Dados do Locatário</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Locatário *</label>
                      <input type="text" required value={form.cliente} onChange={(e) => setForm(prev => ({ ...prev, cliente: e.target.value }))}
                        className="input-base" placeholder="Nome do locatário" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ *</label>
                      <input type="text" required value={form.cnpj}
                        onChange={(e) => setForm(prev => ({ ...prev, cnpj: formatCPFCNPJ(e.target.value) }))}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (!val.trim()) return;
                          const type = detectDocumentType(val);
                          const valid = type === 'cpf' ? isValidCPF(val) : isValidCNPJ(val);
                          if (!valid) toast.error(`${type.toUpperCase()} invalido`);
                        }}
                        className="input-base" placeholder="00.000.000/0001-00" maxLength={18} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">RG</label>
                      <input type="text" value={form.rg} onChange={(e) => setForm(prev => ({ ...prev, rg: e.target.value }))}
                        className="input-base" placeholder="RG do locatario" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                      <input type="text" value={form.telefone} onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value }))}
                        className="input-base" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="sm:col-span-2">
                       <label className="block text-xs font-medium text-gray-600 mb-1">Responsavel pelo Contrato *</label>
                       <input type="text" required value={form.contato} onChange={(e) => setForm(prev => ({ ...prev, contato: e.target.value }))}
                         className="input-base" placeholder="Nome de quem esta fechando o contrato" />
                    </div>
                </div>
              </div>

               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Endereço</h3>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                   <div className="sm:col-span-4">
                     <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                     <input type="text" value={form.endereco} onChange={(e) => setForm(prev => ({ ...prev, endereco: e.target.value }))}
                       className="input-base" placeholder="Rua, Avenida, etc" />
                   </div>
                     <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
                      <input type="text" value={form.referencia} onChange={(e) => setForm(prev => ({ ...prev, referencia: e.target.value }))}
                        className="input-base" placeholder="Opcional" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-3">
                   <div className="col-span-1">
                     <label className="block text-xs font-medium text-gray-600 mb-1">Número *</label>
                     <input type="text" required value={form.numeroEndereco} onChange={(e) => setForm(prev => ({ ...prev, numeroEndereco: e.target.value }))}
                       className="input-base" placeholder="Nº" />
                   </div>
                   <div className="col-span-1 sm:col-span-2">
                     <label className="block text-xs font-medium text-gray-600 mb-1">Bairro *</label>
                     <input type="text" required value={form.bairro} onChange={(e) => setForm(prev => ({ ...prev, bairro: e.target.value }))}
                       className="input-base" placeholder="Bairro" />
                   </div>
                   <div className="col-span-1 sm:col-span-2">
                     <label className="block text-xs font-medium text-gray-600 mb-1">Cidade *</label>
                     <input type="text" required value={form.cidade} onChange={(e) => setForm(prev => ({ ...prev, cidade: e.target.value }))}
                       className="input-base" placeholder="Cidade" />
                   </div>
                   <div className="col-span-1">
                     <label className="block text-xs font-medium text-gray-600 mb-1">UF *</label>
                     <input type="text" required value={form.estado} onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                       className="input-base" placeholder="UF" maxLength={2} />
                   </div>
                </div>
                 <div className="mt-3">
                   <label className="block text-xs font-medium text-gray-600 mb-1">CEP *</label>
                    <input type="text" required value={form.cep} onChange={(e) => setForm(prev => ({ ...prev, cep: formatCEP(e.target.value) }))}
                      className="input-base max-w-full sm:max-w-[200px]" placeholder="00000-000" maxLength={9} />
                 </div>
              </div>

               <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                 <h3 className="text-sm font-bold text-yellow-800 mb-3">Local de Entrega</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-medium text-gray-600 mb-1">Local de Entrega *</label>
                      <input type="text" required value={form.localEntrega} onChange={(e) => setForm(prev => ({ ...prev, localEntrega: e.target.value }))}
                        className="input-base" placeholder="Endereço ou referência da entrega" maxLength={300} />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-gray-600 mb-1">Telefone do Local *</label>
                     <input type="text" required value={form.telefoneEntrega} onChange={(e) => setForm(prev => ({ ...prev, telefoneEntrega: e.target.value }))}
                       className="input-base" placeholder="(00) 0000-0000" />
                   </div>
                 </div>
               </div>

                {form.tipoDocumento === 'devolucao' && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">Condições de Devolução <span className="text-red-500">*</span></h3>
                    <p className="text-xs text-gray-500 mb-3">Selecione ao menos uma opção - obrigatório</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.condicoesDevolucao?.danificado || false}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            condicoesDevolucao: { ...prev.condicoesDevolucao, danificado: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                        <span className="text-xs text-gray-700">Danificado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.condicoesDevolucao?.extraviado || false}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            condicoesDevolucao: { ...prev.condicoesDevolucao, extraviado: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                        <span className="text-xs text-gray-700">Extraviado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.condicoesDevolucao?.testarEmpresa || false}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            condicoesDevolucao: { ...prev.condicoesDevolucao, testarEmpresa: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                        <span className="text-xs text-gray-700">Testar Empresa</span>
                      </label>
                    </div>
                  </div>
                )}

               <div className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                <button type="button" onClick={() => toggleSection('itens')}
                  className="w-full flex items-center justify-between p-4 hover:bg-green-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-700" />
                    <h3 className="text-sm font-bold text-green-800">Itens Locados ({form.itens.filter(it => it.descricao.trim()).length})</h3>
                    <span className="text-xs font-bold text-green-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {openSections.itens ? <ChevronDown className="w-4 h-4 text-green-600" /> : <ChevronRight className="w-4 h-4 text-green-600" />}
                </button>
                <AnimatePresence>
                  {openSections.itens && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex justify-end">
                          <button type="button" onClick={addItem}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700">
                            <Plus className="w-3.5 h-3.5" /> Adicionar Item
                          </button>
                        </div>
                        {form.itens.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-green-100">
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Qtde *</label>
                                <input type="number" min="1" required value={item.quantidade}
                                  onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
                                  className="input-base text-xs" />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descricao *</label>
                                <input type="text" required value={item.descricao}
                                  onChange={(e) => updateItem(idx, 'descricao', e.target.value)}
                                  className="input-base text-xs" placeholder="Descricao do item" />
                              </div>
                               <div>
                                 <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Patrimonio</label>
                                 <input type="text" value={item.patrimonio}
                                   onChange={(e) => updateItem(idx, 'patrimonio', e.target.value)}
                                   className="input-base text-xs" placeholder="PAT-000" />
                               </div>
                               {form.tipoDocumento === 'entrega' && (
                                 <>
                                   <div>
                                     <label className="block text-[10px] font-medium text-gray-500 mb-0.5">D.Loc</label>
                                     <input type="text" value={item.dataLocacao}
                                       onChange={(e) => updateItem(idx, 'dataLocacao', e.target.value)}
                                       className="input-base text-xs" placeholder="DD/MM/AAAA" />
                                   </div>
                                   <div>
                                     <label className="block text-[10px] font-medium text-gray-500 mb-0.5">D.Dev</label>
                                     <input type="text" value={item.dataDevolucao}
                                       onChange={(e) => updateItem(idx, 'dataDevolucao', e.target.value)}
                                       className="input-base text-xs" placeholder="DD/MM/AAAA" />
                                   </div>
                                 </>
                               )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1">
                                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valor R$ *</label>
                                <input type="number" min="0" step="0.01" required value={item.valorUnitario}
                                  onChange={(e) => updateItem(idx, 'valorUnitario', e.target.value)}
                                  className="input-base text-xs" placeholder="0,00" />
                              </div>
                              <div className="text-right text-xs font-medium text-green-700 mt-4">
                                Subtotal: R$ {((Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              {form.itens.length > 1 && (
                                <button type="button" onClick={() => removeItem(idx)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded mt-3">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="text-right pt-2 border-t border-green-200">
                          <span className="text-sm font-bold text-green-800">
                            Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={form.observacao} onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
                  className="input-base min-h-[80px] resize-none" placeholder="Observações sobre o contrato..." rows={3} />
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <button type="button" onClick={() => toggleSection('equipamentos')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gray-700" />
                    <h3 className="text-sm font-bold text-gray-800">Equipamentos ({form.equipamentos.filter(e => e.trim()).length})</h3>
                  </div>
                  {openSections.equipamentos ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                </button>
                <AnimatePresence>
                  {openSections.equipamentos && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-2">
                        {form.equipamentos.map((eq, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input type="text" value={eq} onChange={(e) => updateEquipamento(idx, e.target.value)}
                              className="input-base flex-1 text-sm" placeholder="Nome do equipamento" />
                            {form.equipamentos.length > 1 && (
                              <button type="button" onClick={() => removeEquipamento(idx)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={addEquipamento}
                          className="flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-700">
                          <Plus className="w-4 h-4" /> Adicionar equipamento
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Início *</label>
                  <input type="date" required value={form.inicio} onChange={(e) => setForm(prev => ({ ...prev, inicio: e.target.value }))} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fim *</label>
                  <input type="date" required value={form.fim} onChange={(e) => setForm(prev => ({ ...prev, fim: e.target.value }))} className="input-base" />
                </div>
              </div>

              {form.tipoDocumento !== 'devolucao' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Mensal (R$) *</label>
                    <input type="number" required value={form.valorMensal} onChange={(e) => setForm(prev => ({ ...prev, valorMensal: e.target.value }))}
                      className="input-base" placeholder="0" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor Total (R$)</label>
                      <input type="number" value={total} readOnly className="input-base bg-gray-50 font-semibold" />
                      {form.inicio && form.fim && form.valorMensal && (
                        <p className="text-xs text-gray-500 mt-1">
                          {calcMonths(form.inicio, form.fim)} meses x R$ {Number(form.valorMensal).toLocaleString('pt-BR')}
                        </p>
                      )}

                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="assinado" checked={form.assinado} onChange={(e) => setForm(prev => ({ ...prev, assinado: e.target.checked }))}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
                <label htmlFor="assinado" className="text-sm text-gray-700">Contrato assinado</label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button type="submit" icon={saving ? Loader2 : Save} disabled={saving}>
                  {saving ? 'Salvando...' : isRenew ? 'Renovar' : isEdit ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
