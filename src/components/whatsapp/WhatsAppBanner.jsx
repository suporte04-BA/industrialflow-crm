import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function WhatsAppBanner() {
  const { isGestor } = useAuth();
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

  if (connected || !isGestor) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white pl-2.5 pr-3 py-2 rounded-full flex items-center gap-2.5 shadow-lg shadow-red-500/30 backdrop-blur-sm border border-red-400/30">
        <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold leading-tight">WhatsApp Desconectado</span>
          {queueCount > 0 && (
            <span className="text-[10px] text-red-100 leading-tight">{queueCount} na fila</span>
          )}
        </div>
        <button
          onClick={processQueue}
          disabled={processing}
          className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
        >
          {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
