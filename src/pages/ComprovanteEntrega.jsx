import { useState } from 'react';
import { Plus, Trash2, Save, FileText, X, Upload, Search, Edit3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useComprovantes, useCreateComprovante, useUpdateComprovante, useDeleteComprovante } from '../hooks/useComprovantes';
import PdfImportButton from '../components/common/PdfImportButton';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import DateInput from '../components/ui/DateInput';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { isValidDateBR } from '../lib/dates';
import { isConfigured } from '../lib/supabase';

const emptyForm = {
  contrato: '', atendente: '', data: '', hora: '',
  locatario: '', cpf: '', rg: '', fone: '', contato: '',
  endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
  localEntrega: '', telefoneEntrega: '', observacao: '',
  itens: [{ descricao: '', quantidade: 1, patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 }],
};

export default function ComprovanteEntrega() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingComp, setEditingComp] = useState(null);

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const createComprovante = useCreateComprovante();
  const updateComprovante = useUpdateComprovante();
  const deleteComprovante = useDeleteComprovante();

  const supabaseOk = isConfigured();

  const updateField = (field, value) => setForm({ ...form, [field]: value });

  const addItem = () => setForm({ ...form, itens: [...form.itens, { descricao: '', quantidade: 1, patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 }] });
  const removeItem = (idx) => setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const updated = [...form.itens];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, itens: updated });
  };

  const totalGeral = form.itens.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);

  const openNewForm = () => {
    setEditingComp(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openImportForm = () => {
    setEditingComp(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const handleEdit = (comp) => {
    setEditingComp(comp);
    setForm({
      contrato: comp.contrato || '',
      atendente: comp.atendente || '',
      data: comp.data || '',
      hora: comp.hora || '',
      locatario: comp.locatario || '',
      cpf: comp.cpf || '',
      rg: comp.rg || '',
      fone: comp.fone || '',
      contato: comp.contato || '',
      endereco: comp.endereco || '',
      numero: comp.numero || '',
      bairro: comp.bairro || '',
      cidade: comp.cidade || '',
      estado: comp.estado || '',
      cep: comp.cep || '',
      localEntrega: comp.localEntrega || '',
      telefoneEntrega: comp.telefoneEntrega || '',
      observacao: comp.observacao || '',
      itens: comp.itens && comp.itens.length > 0
        ? comp.itens.map(i => ({
            descricao: i.descricao || '',
            quantidade: i.quantidade || 1,
            patrimonio: i.patrimonio || '',
            dataLocacao: i.dataLocacao || '',
            dataDevolucao: i.dataDevolucao || '',
            valorUnitario: i.valorUnitario || 0,
          }))
        : [{ descricao: '', quantidade: 1, patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 }],
    });
    setShowForm(true);
  };

  const handlePdfImport = (fields) => {
    const newItens = fields.itens && fields.itens.length > 0
      ? fields.itens.map(i => ({
          descricao: i.descricao || '',
          quantidade: i.quantidade || 1,
          patrimonio: i.patrimonio || '',
          dataLocacao: i.data_locacao || '',
          dataDevolucao: i.data_devolucao || '',
          valorUnitario: i.valor_unitario || 0,
        }))
      : [{ descricao: '', quantidade: 1, patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 }];

    setForm((prev) => ({
      ...prev,
      contrato: fields.contrato || prev.contrato,
      atendente: fields.atendente || prev.atendente,
      data: fields.data_retirada || prev.data,
      hora: fields.hora || prev.hora,
      locatario: fields.contato || prev.locatario,
      cpf: fields.cpf_cnpj || prev.cpf,
      rg: fields.rg || prev.rg,
      fone: fields.telefone || prev.fone,
      contato: fields.contato_cliente || prev.contato,
      endereco: fields.endereco || prev.endereco,
      numero: fields.numero || prev.numero,
      bairro: fields.bairro || prev.bairro,
      cidade: fields.cidade || prev.cidade,
      estado: fields.estado || prev.estado,
      cep: fields.cep || prev.cep,
      localEntrega: fields.local_entrega || prev.localEntrega,
      telefoneEntrega: fields.telefone_entrega || prev.telefoneEntrega,
      observacao: fields.observacao || prev.observacao,
      itens: newItens,
    }));

    if (fields.itens && fields.itens.length > 0) {
      toast.success(`${fields.itens.length} item(ns) importado(s)! Preencha os campos obrigatorios e salve.`);
    } else {
      toast.success('Campos importados! Preencha os itens manualmente.');
    }
  };

  const validateForm = () => {
    if (!form.contrato || form.contrato.trim() === '') {
      toast.error('Preencha o numero do contrato');
      return false;
    }
    if (!form.locatario || form.locatario.trim() === '') {
      toast.error('Preencha o nome do locatario');
      return false;
    }

    const itensParaSalvar = form.itens.filter((i) => {
      const hasDesc = i.descricao && i.descricao.trim().length > 0;
      const hasVal = typeof i.valorUnitario === 'number' && i.valorUnitario > 0;
      return hasDesc || hasVal;
    });

    if (itensParaSalvar.length === 0) {
      toast.warning('Nenhum item valido. Adicione itens antes de salvar.');
      return false;
    }

    for (let i = 0; i < itensParaSalvar.length; i++) {
      const item = itensParaSalvar[i];
      if (!item.patrimonio || item.patrimonio.trim() === '') {
        toast.error(`Item ${i + 1}: Preencha PATRIM.`);
        return false;
      }
      if (!item.dataLocacao || item.dataLocacao.trim() === '') {
        toast.error(`Item ${i + 1}: Preencha D.LOC`);
        return false;
      }
      if (!isValidDateBR(item.dataLocacao)) {
        toast.error(`Item ${i + 1}: Data D.LOC invalida (DD/MM/AAAA)`);
        return false;
      }
      if (!item.dataDevolucao || item.dataDevolucao.trim() === '') {
        toast.error(`Item ${i + 1}: Preencha D.DEV`);
        return false;
      }
      if (!isValidDateBR(item.dataDevolucao)) {
        toast.error(`Item ${i + 1}: Data D.DEV invalida (DD/MM/AAAA)`);
        return false;
      }
      if (!item.valorUnitario || item.valorUnitario <= 0) {
        toast.error(`Item ${i + 1}: Preencha VALOR`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const itensFiltrados = form.itens.filter((i) => {
      const hasDesc = i.descricao && i.descricao.trim().length > 0;
      const hasVal = typeof i.valorUnitario === 'number' && i.valorUnitario > 0;
      return hasDesc || hasVal;
    });

    const data = {
      contrato: form.contrato,
      atendente: form.atendente || 'Sistema',
      locatario: form.locatario,
      cpf: form.cpf,
      rg: form.rg,
      fone: form.fone,
      contato: form.contato,
      endereco: form.endereco,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep,
      localEntrega: form.localEntrega,
      telefoneEntrega: form.telefoneEntrega,
      data: form.data,
      hora: form.hora,
      observacao: form.observacao,
      itens: itensFiltrados,
      total: totalGeral,
    };

    try {
      if (editingComp) {
        await updateComprovante.mutateAsync({ id: editingComp.id, updates: data });
        toast.success('Comprovante atualizado!');
      } else {
        await createComprovante.mutateAsync({ ...data, status: 'entregue', assinado: false });
        toast.success('Comprovante criado com sucesso!');
      }
      setShowForm(false);
      setForm({ ...emptyForm });
      setEditingComp(null);
    } catch (err) {
      const msg = err?.message || err?.error?.message || JSON.stringify(err) || 'Erro desconhecido';
      toast.error('Erro ao salvar: ' + msg);
    }
  };

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

  const filteredComprovantes = (comprovantes || []).filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.contrato || '').toLowerCase().includes(term) ||
      (c.locatario || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term) ||
      (c.fone || '').toLowerCase().includes(term) ||
      (c.cidade || '').toLowerCase().includes(term)
    );
  });

  if (isLoading) return <div className="p-4 sm:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 sm:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 px-3 sm:px-0 pb-20">
      {!supabaseOk && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Supabase nao configurado. Salvamento apenas local.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Comprovantes de Entrega</h2>
          <p className="text-sm text-gray-500">{(comprovantes || []).length} comprovantes</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button icon={Upload} onClick={openImportForm} variant="secondary" className="flex-1 sm:flex-initial">
            Importar PDF
          </Button>
          <Button icon={Plus} onClick={openNewForm} className="flex-1 sm:flex-initial">
            Novo
          </Button>
        </div>
      </div>

      {!showForm && (
        <>
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
              description="Importe um PDF ou crie um novo comprovante."
              action={
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button icon={Upload} onClick={openImportForm} variant="secondary">Importar PDF</Button>
                  <Button icon={Plus} onClick={openNewForm}>Novo Comprovante</Button>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredComprovantes.map((c) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{c.contrato}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{c.locatario}</h3>
                      <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                        {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}</p>}
                        {c.fone && <p>{c.fone}</p>}
                        {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
                      </div>
                      {c.itens && c.itens.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns)</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Editar">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:hidden z-40 flex gap-2">
            <Button icon={Upload} onClick={openImportForm} variant="secondary" className="shadow-lg px-4 py-3">
              PDF
            </Button>
            <Button icon={Plus} onClick={openNewForm} className="shadow-lg px-6 py-3">
              Novo
            </Button>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold text-gray-900">
              {editingComp ? 'Editar Comprovante' : 'Novo Comprovante'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingComp(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Importar dados de PDF:</p>
            <PdfImportButton onFieldsExtracted={handlePdfImport} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dados do Contrato</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contrato *</label>
                  <input type="text" required value={form.contrato} onChange={(e) => updateField('contrato', e.target.value)} className="input-base text-sm" placeholder="Ex: 2024-00158" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                  <DateInput value={form.data} onChange={(v) => updateField('data', v)} className="input-base text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                  <input type="text" value={form.hora} onChange={(e) => updateField('hora', e.target.value)} className="input-base text-sm" placeholder="HH:MM" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Atendente</label>
                  <input type="text" value={form.atendente} onChange={(e) => updateField('atendente', e.target.value)} className="input-base text-sm" placeholder="Atendente" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dados do Locatario</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Locatario *</label>
                  <input type="text" required value={form.locatario} onChange={(e) => updateField('locatario', e.target.value)} className="input-base text-sm" placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ</label>
                  <input type="text" value={form.cpf} onChange={(e) => updateField('cpf', e.target.value)} className="input-base text-sm" placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RG</label>
                  <input type="text" value={form.rg} onChange={(e) => updateField('rg', e.target.value)} className="input-base text-sm" placeholder="RG" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                  <input type="text" value={form.fone} onChange={(e) => updateField('fone', e.target.value)} className="input-base text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contato</label>
                  <input type="text" value={form.contato} onChange={(e) => updateField('contato', e.target.value)} className="input-base text-sm" placeholder="Contato" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Endereco</h4>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Endereco</label>
                  <input type="text" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} className="input-base text-sm" placeholder="Rua, Avenida..." />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-2">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                  <input type="text" value={form.bairro} onChange={(e) => updateField('bairro', e.target.value)} className="input-base text-sm" placeholder="Bairro" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N.</label>
                  <input type="text" value={form.numero} onChange={(e) => updateField('numero', e.target.value)} className="input-base text-sm" placeholder="N." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                  <input type="text" value={form.cep} onChange={(e) => updateField('cep', e.target.value)} className="input-base text-sm" placeholder="00000-000" />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-2">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                  <input type="text" value={form.cidade} onChange={(e) => updateField('cidade', e.target.value)} className="input-base text-sm" placeholder="Cidade" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">UF</label>
                  <input type="text" value={form.estado} onChange={(e) => updateField('estado', e.target.value)} className="input-base text-sm" placeholder="UF" maxLength={2} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Local de Entrega</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Local de Entrega</label>
                  <input type="text" value={form.localEntrega} onChange={(e) => updateField('localEntrega', e.target.value)} className="input-base text-sm" placeholder="Local de entrega" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone do Local</label>
                  <input type="text" value={form.telefoneEntrega} onChange={(e) => updateField('telefoneEntrega', e.target.value)} className="input-base text-sm" placeholder="Telefone" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Itens Locados</h4>
                <button type="button" onClick={addItem} className="text-xs text-yellow-600 hover:text-yellow-700">+ Adicionar</button>
              </div>
              <div className="overflow-x-auto -mx-2 px-2 pb-2">
                <table className="w-full text-xs min-w-[550px]">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-500">
                      <th className="px-1.5 py-1.5 font-medium w-10">QTDE</th>
                      <th className="px-1.5 py-1.5 font-medium">DESCRICAO</th>
                      <th className="px-1.5 py-1.5 font-medium w-16 text-red-500">PATRIM.*</th>
                      <th className="px-1.5 py-1.5 font-medium w-20 text-red-500">D.LOC*</th>
                      <th className="px-1.5 py-1.5 font-medium w-20 text-red-500">D.DEV*</th>
                      <th className="px-1.5 py-1.5 font-medium w-20 text-red-500">VALOR*</th>
                      <th className="px-1.5 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.itens.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-1 py-1">
                          <input type="number" min="1" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))} className="input-base text-center text-xs" />
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" value={item.descricao} onChange={(e) => updateItem(idx, 'descricao', e.target.value)} className="input-base text-xs" placeholder="Descricao" />
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" value={item.patrimonio} onChange={(e) => updateItem(idx, 'patrimonio', e.target.value)}
                            className={`input-base text-xs ${!item.patrimonio ? 'border-red-300 bg-red-50' : ''}`}
                            placeholder="Patrim.*" />
                        </td>
                        <td className="px-1 py-1">
                          <DateInput value={item.dataLocacao} onChange={(v) => updateItem(idx, 'dataLocacao', v)}
                            className={`input-base text-xs ${!item.dataLocacao ? 'border-red-300 bg-red-50' : ''}`}
                            placeholder="DD/MM*" />
                        </td>
                        <td className="px-1 py-1">
                          <DateInput value={item.dataDevolucao} onChange={(v) => updateItem(idx, 'dataDevolucao', v)}
                            className={`input-base text-xs ${!item.dataDevolucao ? 'border-red-300 bg-red-50' : ''}`}
                            placeholder="DD/MM*" />
                        </td>
                        <td className="px-1 py-1">
                          <input type="number" min="0" step="0.01" value={item.valorUnitario || ''}
                            onChange={(e) => updateItem(idx, 'valorUnitario', Number(e.target.value))}
                            className={`input-base text-right text-xs ${!item.valorUnitario ? 'border-red-300 bg-red-50' : ''}`}
                            placeholder="0,00*" />
                        </td>
                        <td className="px-1 py-1">
                          {form.itens.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-sm font-bold text-gray-900">Total R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes</label>
              <textarea rows={2} value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} className="input-base text-sm" placeholder="Observacoes..." />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <Button variant="secondary" type="button" onClick={() => { setShowForm(false); setEditingComp(null); }} className="text-sm">Cancelar</Button>
              <Button type="submit" icon={Save} disabled={createComprovante.isPending || updateComprovante.isPending} className="text-sm">
                {(createComprovante.isPending || updateComprovante.isPending) ? 'Salvando...' : editingComp ? 'Salvar Alteracoes' : 'Salvar Comprovante'}
              </Button>
            </div>
          </form>
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
