import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { X, Calendar, User, Wrench, DollarSign, Clock, ChevronDown } from 'lucide-react';

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluido' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function OSDetailModal({ isOpen, onClose, os, onUpdateStatus }) {
  const [newStatus, setNewStatus] = useState('');

  if (!isOpen || !os) return null;

  const handleUpdate = () => {
    if (newStatus && onUpdateStatus) {
      onUpdateStatus(os.id, newStatus);
      setNewStatus('');
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="font-mono text-xs text-gray-500 font-semibold">{os.id}</p>
              <h3 className="font-bold text-gray-900 text-base">{os.tipo}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={User} label="Cliente" value={os.cliente} />
              <InfoRow icon={Wrench} label="Equipamento" value={os.equipamento} />
              <InfoRow icon={User} label="Tecnico" value={os.tecnico} />
              <InfoRow icon={DollarSign} label="Valor" value={`R$ ${Number(os.valor || 0).toLocaleString('pt-BR')}`} />
              <InfoRow icon={Calendar} label="Abertura" value={os.abertura ? new Date(os.abertura + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} />
              <InfoRow icon={Clock} label="Previsao" value={os.previsao ? new Date(os.previsao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} />
            </div>
            <div className="flex gap-3 pt-1">
              <div><p className="text-xs text-gray-500 mb-1">Status</p><StatusBadge status={os.status} /></div>
              <div><p className="text-xs text-gray-500 mb-1">Prioridade</p><StatusBadge status={os.prioridade} /></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Observacoes</p>
              <p className="text-sm text-gray-700">{os.observacoes || 'Servico programado conforme plano de manutencao. Verificar niveis de fluidos e desgaste de pecas mecanicas.'}</p>
            </div>
            {onUpdateStatus && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Atualizar Status</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-400/40">
                      <option value="">Selecione...</option>
                      {statusOptions.filter((s) => s.value !== os.status).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <Button onClick={handleUpdate} disabled={!newStatus} size="sm">Atualizar</Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Fechar</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5"><Icon size={11} />{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}
