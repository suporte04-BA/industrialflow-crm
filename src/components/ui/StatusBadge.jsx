const configs = {
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  concluido: { label: 'Concluido', className: 'bg-green-100 text-green-700 border-green-200' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' },
  alta: { label: 'Alta', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal: { label: 'Normal', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  locado: { label: 'Locado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  disponivel: { label: 'Disponivel', className: 'bg-green-100 text-green-700 border-green-200' },
  manutencao: { label: 'Manutencao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  ativo: { label: 'Ativo', className: 'bg-green-100 text-green-700 border-green-200' },
  vencendo: { label: 'Vencendo', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  vencido: { label: 'Vencido', className: 'bg-red-100 text-red-700 border-red-200' },
  entregue: { label: 'Entregue', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  assinado: { label: 'Assinado', className: 'bg-green-100 text-green-700 border-green-200' },
};

export default function StatusBadge({ status }) {
  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
