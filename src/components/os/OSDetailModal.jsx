import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { X, Calendar, User, Wrench, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function OSDetailModal({ os, onClose }) {
  if (!os) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-mono text-xs text-gray-500 font-semibold">{os.id}</p>
            <h3 className="font-bold text-[#1C1C1C] text-base">{os.tipo}</h3>
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
            <InfoRow icon={DollarSign} label="Valor" value={`R$ ${os.valor?.toLocaleString('pt-BR') || '0'}`} />
            <InfoRow icon={Calendar} label="Abertura" value={os.abertura ? new Date(os.abertura).toLocaleDateString('pt-BR') : '-'} />
            <InfoRow icon={Clock} label="Previsao" value={os.previsao ? new Date(os.previsao).toLocaleDateString('pt-BR') : '-'} />
          </div>
          <div className="flex gap-3 pt-1">
            <div><p className="text-xs text-gray-500 mb-1">Status</p><StatusBadge status={os.status} /></div>
            <div><p className="text-xs text-gray-500 mb-1">Prioridade</p><StatusBadge status={os.prioridade} /></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Observacoes</p>
            <p className="text-sm text-gray-700">{os.observacoes || 'Servico programado conforme plano de manutencao. Verificar niveis de fluidos e desgaste de pecas mecanicas.'}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Fechar</Button>
          <Button variant="primary" className="flex-1 justify-center"
            onClick={() => { toast.success('OS atualizada com sucesso!'); onClose(); }}>
            Atualizar Status
          </Button>
        </div>
      </div>
    </div>
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
