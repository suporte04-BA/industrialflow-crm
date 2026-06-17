import { useState } from 'react';
import { Plus, Trash2, Save, FileText, X, Upload, Search, PenLine, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useComprovantes, useCreateComprovante } from '../hooks/useComprovantes';
import PdfImportButton from '../components/common/PdfImportButton';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

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
  const [activeTab, setActiveTab] = useState('lista');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const createComprovante = useCreateComprovante();

  const updateField = (field, value) => setForm({ ...form, [field]: value });

  const addItem = () => setForm({ ...form, itens: [...form.itens, { descricao: '', quantidade: 1, patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 }] });
  const removeItem = (idx) => setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const updated = [...form.itens];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, itens: updated });
  };

  const totalGeral = form.itens.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);

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
      : form.itens;

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

    setActiveTab('formulario');
    toast.success('PDF importado com sucesso!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contrato) { toast.error('Preencha o numero do contrato'); return; }
    if (!form.locatario) { toast.error('Preencha o nome do locatario'); return; }

    const itensValidos = form.itens.filter((i) => i.descricao && i.descricao.trim().length > 0);
    if (itensValidos.length === 0) {
      toast.error('Adicione ao menos um item com descrição');
      return;
    }

    try {
      await createComprovante.mutateAsync({
        ...form,
        atendente: form.atendente || 'Sistema',
        itens: itensValidos,
        total: totalGeral,
        status: 'entregue',
        assinado: false,
      });
      toast.success('Comprovante de entrega criado!');
      setShowForm(false);
      setForm({ ...emptyForm });
      setActiveTab('lista');
    } catch (err) {
      toast.error('Erro ao criar comprovante: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const filteredComprovantes = (comprovantes || []).filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.contrato || '').toLowerCase().includes(term) ||
      (c.locatario || '').toLowerCase().includes(term) ||
      (c.cpf || '').toLowerCase().includes(term) ||
      (c.rg || '').toLowerCase().includes(term) ||
      (c.fone || '').toLowerCase().includes(term) ||
      (c.contato || '').toLowerCase().includes(term) ||
      (c.endereco || '').toLowerCase().includes(term) ||
      (c.numero || '').toLowerCase().includes(term) ||
      (c.bairro || '').toLowerCase().includes(term) ||
      (c.cidade || '').toLowerCase().includes(term)
    );
  });

  if (isLoading) return <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 px-2 sm:px-0 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Comprovantes de Entrega</h2>
          <p className="text-sm text-gray-500">{(comprovantes || []).length} comprovantes</p>
        </div>
        <Button icon={showForm ? X : Plus} onClick={() => { setShowForm(!showForm); if (!showForm) setActiveTab('formulario'); }} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Fechar' : 'Novo Comprovante'}
        </Button>
      </div>

      {!showForm && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por contrato, locatário, CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-base pl-9 w-full"
                />
              </div>
              <Button icon={Upload} onClick={() => { setShowForm(true); setActiveTab('importar'); }} variant="secondary" className="whitespace-nowrap">
                Importar PDF
              </Button>
            </div>
          </div>

          {(comprovantes || []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum comprovante"
              description="Importe um PDF ou crie um novo comprovante para comecar."
              action={
                <div className="flex gap-2">
                  <Button icon={Upload} onClick={() => { setShowForm(true); setActiveTab('importar'); }} variant="secondary">Importar PDF</Button>
                  <Button icon={Plus} onClick={() => { setShowForm(true); setActiveTab('formulario'); }}>Novo Comprovante</Button>
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
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <div className="flex gap-1 mt-2">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Assinar">
                          <PenLine className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('importar')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'importar' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Upload className="w-4 h-4 inline mr-1" />
              Importar PDF
            </button>
            <button
              onClick={() => setActiveTab('formulario')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'formulario' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Formulario
            </button>
          </div>

          {activeTab === 'importar' && (
            <div className="p-6 text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Importar PDF</h3>
              <p className="text-sm text-gray-500 mb-4">Selecione o PDF do comprovante de entrega</p>
              <PdfImportButton onFieldsExtracted={handlePdfImport} />
            </div>
          )}

          {activeTab === 'formulario' && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Comprovante de Entrega dos Bens Locados</h3>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dados do Contrato</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contrato Nº *</label>
                    <input type="text" required value={form.contrato} onChange={(e) => updateField('contrato', e.target.value)} className="input-base text-sm" placeholder="Ex: 2024-00158" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                    <input type="text" value={form.data} onChange={(e) => updateField('data', e.target.value)} className="input-base text-sm" placeholder="DD/MM/AAAA" />
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
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500">
                        <th className="px-1.5 py-1.5 font-medium w-12">QTDE</th>
                        <th className="px-1.5 py-1.5 font-medium">DESCRICAO</th>
                        <th className="px-1.5 py-1.5 font-medium w-20">PATRIM.</th>
                        <th className="px-1.5 py-1.5 font-medium w-24">D.LOC</th>
                        <th className="px-1.5 py-1.5 font-medium w-24">D.DEV</th>
                        <th className="px-1.5 py-1.5 font-medium w-24">VALOR R$</th>
                        <th className="px-1.5 py-1.5 w-8"></th>
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
                            <input type="text" value={item.patrimonio} onChange={(e) => updateItem(idx, 'patrimonio', e.target.value)} className="input-base text-xs" placeholder="Patrim." />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" value={item.dataLocacao} onChange={(e) => updateItem(idx, 'dataLocacao', e.target.value)} className="input-base text-xs" placeholder="DD/MM/AAAA" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" value={item.dataDevolucao} onChange={(e) => updateItem(idx, 'dataDevolucao', e.target.value)} className="input-base text-xs" placeholder="DD/MM/AAAA" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" min="0" step="0.01" value={item.valorUnitario} onChange={(e) => updateItem(idx, 'valorUnitario', Number(e.target.value))} className="input-base text-right text-xs" />
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
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)} className="text-sm">Cancelar</Button>
                <Button type="submit" icon={Save} disabled={createComprovante.isPending} className="text-sm">
                  {createComprovante.isPending ? 'Salvando...' : 'Salvar Comprovante'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
