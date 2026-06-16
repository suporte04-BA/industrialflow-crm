import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nenhum item encontrado', description = 'Nenhum registro foi encontrado.', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
