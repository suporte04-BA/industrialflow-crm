import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

export default function ContratoModal({ isOpen, onClose, onSave, contrato = null, isRenew = false }) {
  const isEdit = !!contrato && !isRenew;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cliente: '', cnpj: '', equipamentos: [''],
    inicio: '', fim: '', valorTotal: '', valorMensal: '',
    status: 'ativo', assinado: false,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (contrato) {
      setForm({
        cliente: contrato.cliente || '',
        cnpj: contrato.cnpj || '',
        equipamentos: Array.isArray(contrato.equipamentos) ? contrato.equipamentos : [contrato.equipamentos || ''],
        inicio: isRenew ? new Date().toISOString().split('T')[0] : (contrato.inicio || ''),
        fim: isRenew ? '' : (contrato.fim || ''),
        valorTotal: isRenew ? '' : (contrato.valorTotal || ''),
        valorMensal: contrato.valorMensal || '',
        status: isRenew ? 'ativo' : (contrato.status || 'ativo'),
        assinado: isRenew ? false : (contrato.assinado || false),
      });
    } else {
      setForm({ cliente: '', cnpj: '', equipamentos: [''], inicio: '', fim: '', valorTotal: '', valorMensal: '', status: 'ativo', assinado: false });
    }
  }, [contrato, isOpen, isRenew]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addEquipamento = () => setForm({ ...form, equipamentos: [...form.equipamentos, ''] });
  const removeEquipamento = (idx) => setForm({ ...form, equipamentos: form.equipamentos.filter((_, i) => i !== idx) });
  const updateEquipamento = (idx, val) => {
    const updated = [...form.equipamentos];
    updated[idx] = val;
    setForm({ ...form, equipamentos: updated });
  };

  const calcTotal = () => {
    if (form.inicio && form.fim && form.valorMensal) {
      const inicio = new Date(form.inicio);
      const fim = new Date(form.fim);
      const meses = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24 * 30)));
      return meses * Number(form.valorMensal);
    }
    return form.valorTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const total = calcTotal();
      await onSave({
        ...form,
        equipamentos: form.equipamentos.filter(Boolean),
        valorTotal: Number(total) || 0,
        valorMensal: Number(form.valorMensal) || 0,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {isRenew ? 'Renovar Contrato' : isEdit ? 'Editar Contrato' : 'Novo Contrato'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <input type="text" required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="input-base" placeholder="Nome do cliente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input type="text" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="input-base" placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipamentos</label>
                {form.equipamentos.map((eq, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" value={eq} onChange={(e) => updateEquipamento(idx, e.target.value)}
                      className="input-base flex-1" placeholder="Nome do equipamento" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
                  <input type="date" required value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="input-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label>
                  <input type="date" required value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="input-base" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal (R$) *</label>
                  <input type="number" required value={form.valorMensal} onChange={(e) => setForm({ ...form, valorMensal: e.target.value })}
                    className="input-base" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                  <input type="number" value={calcTotal()} readOnly className="input-base bg-gray-50" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="assinado" checked={form.assinado} onChange={(e) => setForm({ ...form, assinado: e.target.checked })}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
