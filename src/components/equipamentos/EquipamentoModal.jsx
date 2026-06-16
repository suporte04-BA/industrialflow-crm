import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

const categorias = ['Terraplanagem', 'Escavacao', 'Agricola', 'Compactacao', 'Icamento', 'Movimentacao', 'Mineracao', 'Construcao'];
const statusOptions = ['disponivel', 'locado', 'manutencao'];

export default function EquipamentoModal({ isOpen, onClose, onSave, equipamento = null }) {
  const isEdit = !!equipamento;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', categoria: 'Terraplanagem', status: 'disponivel',
    cliente: '', contrato: '', locacaoInicio: '', locacaoFim: '',
    valorMensal: '', horasUso: '', ultimaRevisao: '',
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (equipamento) {
      setForm({
        nome: equipamento.nome || '',
        categoria: equipamento.categoria || 'Terraplanagem',
        status: equipamento.status || 'disponivel',
        cliente: equipamento.cliente || '',
        contrato: equipamento.contrato || '',
        locacaoInicio: equipamento.locacaoInicio || '',
        locacaoFim: equipamento.locacaoFim || '',
        valorMensal: equipamento.valorMensal || '',
        horasUso: equipamento.horasUso || '',
        ultimaRevisao: equipamento.ultimaRevisao || '',
      });
    } else {
      setForm({ nome: '', categoria: 'Terraplanagem', status: 'disponivel', cliente: '', contrato: '', locacaoInicio: '', locacaoFim: '', valorMensal: '', horasUso: '', ultimaRevisao: '' });
    }
  }, [equipamento, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        valorMensal: Number(form.valorMensal) || 0,
        horasUso: Number(form.horasUso) || 0,
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
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input-base" placeholder="Ex: Retroescavadeira CAT 416" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-base">
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-base">
                    {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input type="text" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                    className="input-base" placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                  <input type="text" value={form.contrato} onChange={(e) => setForm({ ...form, contrato: e.target.value })}
                    className="input-base" placeholder="CT-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locacao Inicio</label>
                  <input type="date" value={form.locacaoInicio} onChange={(e) => setForm({ ...form, locacaoInicio: e.target.value })} className="input-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locacao Fim</label>
                  <input type="date" value={form.locacaoFim} onChange={(e) => setForm({ ...form, locacaoFim: e.target.value })} className="input-base" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal</label>
                  <input type="number" value={form.valorMensal} onChange={(e) => setForm({ ...form, valorMensal: e.target.value })}
                    className="input-base" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas de Uso</label>
                  <input type="number" value={form.horasUso} onChange={(e) => setForm({ ...form, horasUso: e.target.value })}
                    className="input-base" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ultima Revisao</label>
                  <input type="date" value={form.ultimaRevisao} onChange={(e) => setForm({ ...form, ultimaRevisao: e.target.value })} className="input-base" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button type="submit" icon={saving ? Loader2 : Save} disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar Alteracoes' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
