import { useState } from 'react';
import { Plus, Trash2, Save, FileText, X } from 'lucide-react';
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
      fone: fields.telefone || prev.fone,
      contato: fields.contato_cliente || prev.contato,
      endereco: fields.endereco || prev.endereco,
      bairro: fields.bairro || prev.bairro,
      cidade: fields.cidade || prev.cidade,
      estado: fields.estado || prev.estado,
      cep: fields.cep || prev.cep,
      localEntrega: fields.local_entrega || prev.localEntrega,
      telefoneEntrega: fields.telefone_entrega || prev.telefoneEntrega,
      observacao: fields.observacao || prev.observacao,
      itens: newItens,
    }));

    setShowForm(true);
    toast.success('PDF importado com sucesso!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contrato) { toast.error('Preencha o numero do contrato'); return; }
    if (!form.locatario) { toast.error('Preencha o nome do locatario'); return; }
    try {
      await createComprovante.mutateAsync({
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
        itens: form.itens.filter((i) => i.descricao),
        total: totalGeral,
        status: 'entregue',
        assinado: false,
      });
      toast.success('Comprovante de entrega criado!');
      setShowForm(false);
      setForm({ ...emptyForm });
    } catch (err) {
      toast.error('Erro ao criar comprovante: ' + (err.message || 'Erro desconhecido'));
    }
  };

  if (isLoading) return <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comprovantes de Entrega</h2>
          <p className="text-sm text-gray-500">{comprovantes.length} comprovantes</p>
        </div>
        <Button icon={showForm ? X : Plus} onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Fechar' : 'Novo Comprovante'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Comprovante de Entrega dos Bens Locados</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          </div>

          <div className="flex justify-center">
            <PdfImportButton onFieldsExtracted={handlePdfImport} />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do Contrato</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato Nº *</label>
                <input
                  type="text"
                  required
                  value={form.contrato}
                  onChange={(e) => updateField('contrato', e.target.value)}
                  className="input-base"
                  placeholder="Ex: 2024-00158"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input type="text" value={form.data} onChange={(e) => updateField('data', e.target.value)} className="input-base" placeholder="DD/MM/AAAA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input type="text" value={form.hora} onChange={(e) => updateField('hora', e.target.value)} className="input-base" placeholder="HH:MM" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atendente</label>
                <input type="text" value={form.atendente} onChange={(e) => updateField('atendente', e.target.value)} className="input-base" placeholder="Atendente" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do Locatário</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locatário *</label>
                <input type="text" required value={form.locatario} onChange={(e) => updateField('locatario', e.target.value)} className="input-base" placeholder="Locatário" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input type="text" value={form.cpf} onChange={(e) => updateField('cpf', e.target.value)} className="input-base" placeholder="CPF" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                <input type="text" value={form.rg} onChange={(e) => updateField('rg', e.target.value)} className="input-base" placeholder="RG" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={form.fone} onChange={(e) => updateField('fone', e.target.value)} className="input-base" placeholder="Telefone" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                <input type="text" value={form.contato} onChange={(e) => updateField('contato', e.target.value)} className="input-base" placeholder="Contato" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Endereço</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} className="input-base" placeholder="Endereço" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" value={form.numero} onChange={(e) => updateField('numero', e.target.value)} className="input-base" placeholder="Número" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={form.bairro} onChange={(e) => updateField('bairro', e.target.value)} className="input-base" placeholder="Bairro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.cidade} onChange={(e) => updateField('cidade', e.target.value)} className="input-base" placeholder="Cidade" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input type="text" value={form.estado} onChange={(e) => updateField('estado', e.target.value)} className="input-base" placeholder="UF" maxLength={2} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Local de Entrega</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local de Entrega</label>
                <input type="text" value={form.localEntrega} onChange={(e) => updateField('localEntrega', e.target.value)} className="input-base" placeholder="Local de entrega" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone do Local</label>
                <input type="text" value={form.telefoneEntrega} onChange={(e) => updateField('telefoneEntrega', e.target.value)} className="input-base" placeholder="Telefone" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Itens Locados</h4>
              <button type="button" onClick={addItem} className="text-sm text-yellow-600 hover:text-yellow-700">+ Adicionar Item</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="px-2 py-2 font-medium w-16">QTDE</th>
                    <th className="px-2 py-2 font-medium">DESCRIÇÃO</th>
                    <th className="px-2 py-2 font-medium w-24">PATRIM.</th>
                    <th className="px-2 py-2 font-medium w-32">D.LOC</th>
                    <th className="px-2 py-2 font-medium w-32">D.DEV</th>
                    <th className="px-2 py-2 font-medium w-28">VALOR R$</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.itens.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))}
                          className="input-base text-center"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => updateItem(idx, 'descricao', e.target.value)}
                          className="input-base"
                          placeholder="Descrição do item"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.patrimonio}
                          onChange={(e) => updateItem(idx, 'patrimonio', e.target.value)}
                          className="input-base"
                          placeholder="Patrim."
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.dataLocacao}
                          onChange={(e) => updateItem(idx, 'dataLocacao', e.target.value)}
                          className="input-base"
                          placeholder="DD/MM/AAAA"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={item.dataDevolucao}
                          onChange={(e) => updateItem(idx, 'dataDevolucao', e.target.value)}
                          className="input-base"
                          placeholder="DD/MM/AAAA"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valorUnitario}
                          onChange={(e) => updateItem(idx, 'valorUnitario', Number(e.target.value))}
                          className="input-base text-right"
                        />
                      </td>
                      <td className="px-1 py-1">
                        {form.itens.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea rows={2} value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} className="input-base" placeholder="Observações..." />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" icon={Save} disabled={createComprovante.isPending}>
              {createComprovante.isPending ? 'Salvando...' : 'Salvar Comprovante'}
            </Button>
          </div>
        </form>
      )}

      {comprovantes.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum comprovante" description="Crie um comprovante de entrega para comecar."
          action={<Button icon={Plus} onClick={() => setShowForm(true)}>Novo Comprovante</Button>} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3 font-medium">Locatário</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {comprovantes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.contrato}</td>
                    <td className="px-4 py-3 font-medium">{c.locatario}</td>
                    <td className="px-4 py-3">{c.data || '-'}</td>
                    <td className="px-4 py-3 font-medium">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
