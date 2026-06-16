import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { useEquipamentos } from '../../hooks/useEquipamentos';

const statusOptions = ['pendente', 'em_andamento', 'concluido', 'cancelado'];
const prioridadeOptions = ['normal', 'alta', 'urgente'];

export default function OSModal({ isOpen, onClose, onSave, os = null }) {
  const isEdit = !!os;
  const [saving, setSaving] = useState(false);
  const { data: equipamentos } = useEquipamentos();
  const [form, setForm] = useState({
    cliente: '', equipamento: '', tipo: '', status: 'pendente',
    prioridade: 'normal', tecnico: '', abertura: '', previsao: '',
    valor: '', observacoes: '',
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (os) {
      setForm({
        cliente: os.cliente || '',
        equipamento: os.equipamento || '',
        tipo: os.tipo || '',
        status: os.status || 'pendente',
        prioridade: os.prioridade || 'normal',
        tecnico: os.tecnico || '',
        abertura: os.abertura || '',
        previsao: os.previsao || '',
        valor: os.valor || '',
        observacoes: os.observacoes || '',
      });
    } else {
      setForm({ cliente: '', equipamento: '', tipo: '', status: 'pendente', prioridade: 'normal', tecnico: '', abertura: new Date().toISOString().split('T')[0], previsao: '', valor: '', observacoes: '' });
    }
  }, [os, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        valor: Number(form.valor) || 0,
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
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Ordem de Servico' : 'Nova Ordem de Servico'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <input type="text" required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="input-base" placeholder="Nome do cliente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento *</label>
                <select required value={form.equipamento} onChange={(e) => setForm({ ...form, equipamento: e.target.value })} className="input-base">
                  <option value="">Selecione...</option>
                  {equipamentos?.map((eq) => (
                    <option key={eq.id} value={eq.nome}>{eq.nome} ({eq.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Servico *</label>
                <input type="text" required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="input-base" placeholder="Ex: Manutencao Preventiva" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-base">
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="input-base">
                    {prioridadeOptions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico</label>
                  <input type="text" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
                    className="input-base" placeholder="Nome do tecnico" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abertura</label>
                  <input type="date" value={form.abertura} onChange={(e) => setForm({ ...form, abertura: e.target.value })} className="input-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previsao</label>
                  <input type="date" value={form.previsao} onChange={(e) => setForm({ ...form, previsao: e.target.value })} className="input-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    className="input-base" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="input-base" placeholder="Observacoes sobre a OS..." />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button type="submit" icon={saving ? Loader2 : Save} disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar OS'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
