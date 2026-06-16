import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <p className="text-sm text-gray-600 text-center max-w-sm">
        {error?.message || 'Ocorreu um erro ao carregar os dados.'}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={RefreshCw}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
