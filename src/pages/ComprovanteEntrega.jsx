import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { db, isConfigured } from '../lib/supabase';

const emptyItem = () => ({ qtde: '', descricao: '', patrimonio: '', dLoc: '', dDev: '', valor: '' });
const emptyForm = { contrato: '', atendente: '', locatario: '', cpf: '', rg: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', fone: '', contato: '', localEntrega: '', telefoneEntrega: '', data: '', hora: '', observacao: '', itens: [emptyItem()] };

export default function ComprovanteEntrega() {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [comprovantes, setComprovantes] = useState([]);

  const handleField = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const handleItem = (i, field, value) => { const itens = [...form.itens]; itens[i] = { ...itens[i], [field]: value }; setForm(f => ({ ...f, itens })); };
  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, emptyItem()] }));
  const removeItem = (i) => setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.contrato || !form.locatario) { toast.error('Preencha ao menos o contrato e o locatario.'); return; }
    const total = form.itens.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0);

    if (isConfigured()) {
      const { data, error } = await db.comprovantes.create({
        contrato: form.contrato,
        atendente: form.atendente,
        locatario: form.locatario,
        cpf: form.cpf,
        rg: form.rg,
        telefone: form.fone,
        contato: form.contato,
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        local_entrega: form.localEntrega,
        telefone_entrega: form.telefoneEntrega,
        data: form.data || null,
        hora: form.hora || null,
        observacao: form.observacao,
        itens: form.itens,
        total,
        status: 'entregue',
      });
      if (!error) {
        setComprovantes(prev => [{ ...data, total: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }, ...prev]);
        toast.success('Comprovante salvo!');
      }
    } else {
      const novo = { ...form, id: Date.now().toString(), total: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, status: 'entregue', assinado: false };
      setComprovantes(prev => [novo, ...prev]);
      toast.success('Comprovante salvo com sucesso!');
    }
    setForm(emptyForm); setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus size={16} /> Novo Comprovante</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#1C1C1C] text-base">Comprovante de Entrega dos Bens Locados</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-700">Cancelar</button>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do Contrato</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Contrato Nº" value={form.contrato} onChange={v => handleField('contrato', v)} />
              <Field label="Data" value={form.data} onChange={v => handleField('data', v)} placeholder="DD/MM/AAAA" />
              <Field label="Hora" value={form.hora} onChange={v => handleField('hora', v)} placeholder="HH:MM" />
              <Field label="Atendente" value={form.atendente} onChange={v => handleField('atendente', v)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados do Locatario</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Locatario" value={form.locatario} onChange={v => handleField('locatario', v)} className="sm:col-span-2" />
              <Field label="CPF" value={form.cpf} onChange={v => handleField('cpf', v)} />
              <Field label="RG" value={form.rg} onChange={v => handleField('rg', v)} />
              <Field label="Telefone" value={form.fone} onChange={v => handleField('fone', v)} />
              <Field label="Contato" value={form.contato} onChange={v => handleField('contato', v)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Endereco</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Endereco" value={form.endereco} onChange={v => handleField('endereco', v)} className="sm:col-span-2" />
              <Field label="Numero" value={form.numero} onChange={v => handleField('numero', v)} />
              <Field label="Bairro" value={form.bairro} onChange={v => handleField('bairro', v)} />
              <Field label="Cidade" value={form.cidade} onChange={v => handleField('cidade', v)} />
              <Field label="Estado" value={form.estado} onChange={v => handleField('estado', v)} />
              <Field label="CEP" value={form.cep} onChange={v => handleField('cep', v)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Itens Locados</p>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-yellow-600 font-semibold hover:underline"><Plus size={13} /> Adicionar Item</button>
            </div>
            <div className="space-y-2">
              {form.itens.map((item, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                  <input value={item.qtde} onChange={e => handleItem(i, 'qtde', e.target.value)} placeholder="Qtde" className="col-span-1 input-base text-center" />
                  <input value={item.descricao} onChange={e => handleItem(i, 'descricao', e.target.value)} placeholder="Descricao" className="col-span-2 sm:col-span-4 input-base" />
                  <input value={item.patrimonio} onChange={e => handleItem(i, 'patrimonio', e.target.value)} placeholder="Patrim." className="col-span-1 input-base" />
                  <input value={item.dLoc} onChange={e => handleItem(i, 'dLoc', e.target.value)} placeholder="DD/MM/AAAA" className="col-span-1 sm:col-span-2 input-base" />
                  <input value={item.dDev} onChange={e => handleItem(i, 'dDev', e.target.value)} placeholder="DD/MM/AAAA" className="col-span-1 sm:col-span-2 input-base" />
                  <input value={item.valor} onChange={e => handleItem(i, 'valor', e.target.value)} placeholder="0,00" className="col-span-1 input-base text-right" />
                  <button onClick={() => removeItem(i)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="flex justify-end pt-2 pr-8">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-[#1C1C1C]">R$ {form.itens.reduce((acc, it) => acc + (parseFloat(it.valor) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1 justify-center">Cancelar</Button>
            <Button variant="primary" onClick={handleSave} className="flex-1 justify-center"><CheckCircle size={15} /> Salvar Comprovante</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{comprovantes.length} comprovante(s)</p>
        {comprovantes.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-gray-500">Contrato {c.contrato}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="font-bold text-[#1C1C1C] text-sm">{c.locatario}</p>
                <p className="text-xs text-gray-400">{c.localEntrega || c.local_entrega}</p>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <p className="text-xl font-bold text-[#1C1C1C]">{c.total}</p>
                <p className="text-xs text-gray-400">{c.itens?.length ?? 0} item(ns) · {c.data}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder || label}
        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40 bg-white" />
    </div>
  );
}
