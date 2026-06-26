const configs = {
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-500 text-white border-blue-600 shadow-sm' },
  pendente: { label: 'Pendente', className: 'bg-amber-400 text-amber-900 border-amber-500 shadow-sm' },
  concluido: { label: 'Concluido', className: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-400 text-white border-gray-500 shadow-sm' },
  urgente: { label: 'Urgente', className: 'bg-red-500 text-white border-red-600 shadow-sm animate-pulse' },
  alta: { label: 'Alta', className: 'bg-orange-500 text-white border-orange-600 shadow-sm' },
  normal: { label: 'Normal', className: 'bg-slate-500 text-white border-slate-600 shadow-sm' },
  locado: { label: 'Locado', className: 'bg-blue-500 text-white border-blue-600 shadow-sm' },
  disponivel: { label: 'Disponivel', className: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' },
  manutencao: { label: 'Manutencao', className: 'bg-orange-500 text-white border-orange-600 shadow-sm' },
  ativo: { label: 'Ativo', className: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' },
  vencendo: { label: 'Vencendo', className: 'bg-amber-400 text-amber-900 border-amber-500 shadow-sm' },
  vencido: { label: 'Vencido', className: 'bg-red-500 text-white border-red-600 shadow-sm' },
  entregue: { label: 'Entregue', className: 'bg-blue-500 text-white border-blue-600 shadow-sm' },
  assinado: { label: 'Assinado', className: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' },
};

export default function StatusBadge({ status }) {
  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
