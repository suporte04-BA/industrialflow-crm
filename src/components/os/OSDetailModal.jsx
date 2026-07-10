import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import { X, Calendar, User, Wrench, DollarSign, Clock, ChevronDown, ExternalLink, FileText, AlertTriangle, Hash, Printer } from 'lucide-react';

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluido' },
  { value: 'cancelado', label: 'Cancelado' },
];

const statusColorMap = {
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  em_andamento: 'bg-blue-100 text-blue-700 border-blue-200',
  concluido: 'bg-green-100 text-green-700 border-green-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
};

const prioridadeColorMap = {
  normal: 'bg-gray-100 text-gray-600',
  alta: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
};

const statusLabelMap = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
};

const prioridadeLabelMap = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export default function OSDetailModal({ isOpen, onClose, os, onUpdateStatus }) {
  const [newStatus, setNewStatus] = useState('');

  const handleUpdate = () => {
    if (newStatus && onUpdateStatus) {
      onUpdateStatus(os.id, newStatus);
      setNewStatus('');
    }
  };

  const handleOpenDetailPage = () => {
    if (os?.id) {
      window.open(`/os-detail/${os.id}`, '_blank');
    }
  };

  const handleOpenPrintPage = () => {
    if (os?.id) {
      window.open(`/os-print/${os.id}`, '_blank');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const osNumber = os?.id?.toString().padStart(3, '0') || '000';

  return (
    <AnimatePresence>
      {isOpen && os && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText size={22} className="text-gray-900" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">Ordem de Servico OS-{osNumber}</h3>
                  <p className="text-xs text-gray-500">{os.cliente}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColorMap[os.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabelMap[os.status] || os.status}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${prioridadeColorMap[os.prioridade] || 'bg-gray-100 text-gray-600'}`}>
                  {prioridadeLabelMap[os.prioridade] || os.prioridade}
                </span>
                {os.tipo && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {os.tipo}
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Informacoes da OS</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <InfoRow icon={Hash} label="Codigo" value={os.id} mono />
                  <InfoRow icon={User} label="Cliente" value={os.cliente} />
                  <InfoRow icon={User} label="Tecnico / Fornecedor" value={os.tecnico} />
                  <InfoRow icon={Wrench} label="Equipamento" value={os.equipamento} />
                  <InfoRow icon={Wrench} label="Tipo de Servico" value={os.tipo} />
                  <InfoRow icon={DollarSign} label="Valor" value={`R$ ${Number(os.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight />
                  <InfoRow icon={Calendar} label="Data de Abertura" value={formatDate(os.abertura)} />
                  <InfoRow icon={Clock} label="Previsao de Conclusao" value={formatDate(os.previsao)} />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Observacoes / Descricao do Servico</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{os.observacoes || 'Nenhuma observacao registrada.'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Resumo</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <ResumoCard label="Status" value={statusLabelMap[os.status] || os.status} color={os.status === 'concluido' ? 'green' : os.status === 'pendente' ? 'yellow' : 'gray'} />
                  <ResumoCard label="Prioridade" value={prioridadeLabelMap[os.prioridade] || os.prioridade} color={os.prioridade === 'urgente' ? 'red' : os.prioridade === 'alta' ? 'orange' : 'gray'} />
                  <ResumoCard label="Abertura" value={formatDate(os.abertura)} color="gray" />
                  <ResumoCard label="Previsao" value={formatDate(os.previsao)} color="gray" />
                </div>
              </div>

              {os.prioridade === 'urgente' && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Atencao: Prioridade Urgente</p>
                    <p className="text-xs text-red-600 mt-0.5">Esta Ordem de Servico requer atencao imediata. Providencie a execucao o mais rapido possivel.</p>
                  </div>
                </div>
              )}

              {onUpdateStatus && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Atualizar Status</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-400/40">
                        <option value="">Selecione novo status...</option>
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

            <div className="flex gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 bg-white shrink-0">
              <Button onClick={handleOpenDetailPage} className="flex-1 justify-center gap-2" variant="secondary">
                <ExternalLink size={16} /> Abrir Pagina Completa
              </Button>
              <Button onClick={handleOpenPrintPage} className="flex-1 justify-center gap-2" variant="secondary">
                <Printer size={16} /> Imprimir
              </Button>
              <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Fechar</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ icon: Icon, label, value, highlight, mono }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 flex items-center gap-1.5 mb-0.5 font-medium uppercase tracking-wider">
        <Icon size={11} />{label}
      </p>
      <p className={`text-sm font-semibold truncate ${highlight ? 'text-green-600' : 'text-gray-800'} ${mono ? 'font-mono tracking-wider' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function ResumoCard({ label, value, color }) {
  const colorStyles = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`rounded-lg p-3 border ${colorStyles[color] || colorStyles.gray}`}>
      <p className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
