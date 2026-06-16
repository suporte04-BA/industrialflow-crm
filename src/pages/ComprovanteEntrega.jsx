import { useState } from 'react';
import { Plus, Trash2, Save, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { useComprovantes, useCreateComprovante } from '../hooks/useComprovantes';
import { useContratos } from '../hooks/useContratos';
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
  itens: [{ descricao: '', quantidade: 1, valorUnitario: 0 }],
};

export default function ComprovanteEntrega() {
  const [showForm, setShowForm] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState('');
  const [form, setForm] = useState({ ...emptyForm });

  const { data: comprovantes, isLoading, isError, error, refetch } = useComprovantes();
  const { data: contratos } = useContratos();
  const createComprovante = useCreateComprovante();

  const addItem = () => setForm({ ...form, itens: [...form.itens, { descricao: '', quantidade: 1, valorUnitario: 0 }] });
  const removeItem = (idx) => setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const updated = [...form.itens];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, itens: updated });
  };

  const totalGeral = form.itens.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);

  const handlePdfImport = (fields) => {
    setForm((prev) => ({
      ...prev,
      contrato: fields.contrato || prev.contrato,
      atendente: fields.atendente || prev.atendente,
      data: fields.data || prev.data,
      hora: fields.hora || prev.hora,
      locatario: fields.locatario || prev.locatario,
      cpf: fields.cpf || prev.cpf,
      rg: fields.rg || prev.rg,
      fone: fields.fone || prev.fone,
      contato: fields.contato || prev.contato,
      endereco: fields.endereco || prev.endereco,
      numero: fields.numero || prev.numero,
      bairro: fields.bairro || prev.bairro,
      cidade: fields.cidade || prev.cidade,
      estado: fields.estado || prev.estado,
      cep: fields.cep || prev.cep,
      localEntrega: fields.localEntrega || prev.localEntrega,
      telefoneEntrega: fields.telefoneEntrega || prev.telefoneEntrega,
      observacao: fields.observacao || prev.observacao,
    }));
    setShowForm(true);
    toast.success('PDF importado com sucesso!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContrato) { toast.error('Selecione um contrato'); return; }
    if (!form.locatario) { toast.error('Preencha o nome do locatario'); return; }
    try {
      await createComprovante.mutateAsync({
        contrato: selectedContrato,
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
      setSelectedContrato('');
      setForm({ ...emptyForm });
    } catch (err) {
      toast.error('Erro ao criar comprovante');
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato No *</label>
                <select required value={selectedContrato} onChange={(e) => { setSelectedContrato(e.target.value); setForm({ ...form, contrato: e.target.value }); }} className="input-base">
                  <option value="">Selecione...</option>
                  {contratos?.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.id} - {ct.cliente}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input type="text" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="input-base" placeholder="DD/MM/AAAA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input type="text" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="input-base" placeholder="HH:MM" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atendente</label>
                <input type="text" value={form.atendente} onChange={(e) => setForm({ ...form, atendente: e.target.value })} className="input-base" placeholder="Atendente" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do Locatario</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locatario *</label>
                <input type="text" required value={form.locatario} onChange={(e) => setForm({ ...form, locatario: e.target.value })} className="input-base" placeholder="Locatario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input type="text" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className="input-base" placeholder="CPF" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                <input type="text" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} className="input-base" placeholder="RG" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={form.fone} onChange={(e) => setForm({ ...form, fone: e.target.value })} className="input-base" placeholder="Telefone" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                <input type="text" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} className="input-base" placeholder="Contato" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Endereco</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                <input type="text" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input-base" placeholder="Endereco" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                <input type="text" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="input-base" placeholder="Numero" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="input-base" placeholder="Bairro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="input-base" placeholder="Cidade" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input type="text" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input-base" placeholder="UF" maxLength={2} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Itens Locados</h4>
            {form.itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end mb-2">
                <div className="flex-1">
                  <input type="text" value={item.descricao} onChange={(e) => updateItem(idx, 'descricao', e.target.value)} className="input-base" placeholder="Descricao do item" />
                </div>
                <div className="w-20">
                  <input type="number" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))} className="input-base" placeholder="Qtd" />
                </div>
                <div className="w-28">
                  <input type="number" value={item.valorUnitario} onChange={(e) => updateItem(idx, 'valorUnitario', Number(e.target.value))} className="input-base" placeholder="Valor Unit." />
                </div>
                {form.itens.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-4">
              <button type="button" onClick={addItem} className="text-sm text-yellow-600 hover:text-yellow-700">+ Adicionar item</button>
              <span className="text-sm font-bold text-gray-900">Total: R$ {totalGeral.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
            <textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="input-base" placeholder="Observacoes..." />
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
                  <th className="px-4 py-3 font-medium">Locatario</th>
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
                    <td className="px-4 py-3 font-medium">R$ {Number(c.total).toLocaleString('pt-BR')}</td>
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
