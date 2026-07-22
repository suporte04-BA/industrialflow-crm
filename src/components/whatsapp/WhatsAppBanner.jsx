import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, WifiOff } from 'lucide-react';
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
    <div className="bg-red-500 text-white px-3 py-1.5 flex items-center justify-center gap-2 text-xs font-medium shadow-sm relative z-50">
      <WifiOff className="w-3.5 h-3.5" />
      <span>WhatsApp Desconectado</span>
      {queueCount > 0 && (
        <>
          <span className="text-red-200">|</span>
          <span className="text-red-100">{queueCount} mensagem(ns) na fila</span>
          <button
            onClick={processQueue}
            disabled={processing}
            className="ml-1 p-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </>
      )}
    </div>
  );
}
