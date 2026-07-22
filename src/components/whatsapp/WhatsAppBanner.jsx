import { useState, useEffect, useCallback } from 'react';
import { Smartphone, RefreshCw, Loader2 } from 'lucide-react';

export default function WhatsAppBanner() {
  const [connected, setConnected] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/connection-state');
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
      }
    } catch {
      setConnected(false);
    }
    try {
      const res = await fetch('/api/whatsapp/queue/count');
      if (res.ok) {
        const data = await res.json();
        setQueueCount(data.count || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (connected && queueCount > 0) {
      processQueue();
    }
  }, [connected, queueCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const processQueue = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/whatsapp/process-queue', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.processed > 0) {
          setQueueCount(0);
        }
      }
    } catch {}
    setProcessing(false);
  };

  if (connected) return null;

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg relative z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">WhatsApp Desconectado</span>
          <span className="text-red-200 text-xs">|</span>
          <span className="text-xs text-red-100">
            Mensagens serao armazenadas ate reconectar
          </span>
        </div>
      </div>
      {queueCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
            {queueCount} na fila
          </span>
          <button
            onClick={processQueue}
            disabled={processing || !connected}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
