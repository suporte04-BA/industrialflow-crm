import { useState, useEffect, useCallback, useRef } from 'react';
import { X, RefreshCw, Wifi, WifiOff, Loader2, Smartphone, MessageSquare, Users, Clock, Unplug, RotateCcw, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const QR_REFRESH_SECONDS = 30;

export default function WhatsAppManager({ isOpen, onClose }) {
  const [instance, setInstance] = useState(null);
  const [connectionState, setConnectionState] = useState('unknown');
  const [qrImage, setQrImage] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_SECONDS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [mode, setMode] = useState('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const countdownRef = useRef(null);
  const pollRef = useRef(null);

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance');
      if (res.ok) {
        const data = await res.json();
        setInstance(data);
        setConnectionState(data.status === 'open' ? 'open' : 'close');
      } else {
        setInstance(null);
        setConnectionState('close');
      }
    } catch {
      setConnectionState('close');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQR = useCallback(async () => {
    if (connectionState === 'open') return;
    try {
      const res = await fetch('/api/whatsapp/qr');
      if (res.ok) {
        const data = await res.json();
        if (data.base64) setQrImage(data.base64);
        if (data.pairingCode) setPairingCode(data.pairingCode);
        if (data.state) setConnectionState(data.state);
      }
    } catch { /* ignore */ }
  }, [connectionState]);

  const fetchPairingCode = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um numero valido com DDD');
      return;
    }
    setActionLoading('pairing');
    try {
      const clean = phoneNumber.replace(/\D/g, '');
      const number = clean.startsWith('55') ? clean : '55' + clean;
      const res = await fetch('/api/whatsapp/qr/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
          setQrImage(null);
          toast.success('Codigo de pareamento gerado!');
        } else if (data.state === 'open') {
          toast.success('Ja conectado!');
          fetchInstance();
        } else {
          toast.error('Nao foi possivel gerar o codigo');
        }
      }
    } catch {
      toast.error('Erro ao gerar codigo');
    } finally {
      setActionLoading(null);
    }
  }, [phoneNumber, fetchInstance]);

  const handleDisconnect = useCallback(async () => {
    setActionLoading('disconnect');
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        toast.success('WhatsApp desconectado!');
        setConnectionState('close');
        setQrImage(null);
        setPairingCode(null);
        fetchInstance();
      } else {
        toast.error('Erro ao desconectar');
      }
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInstance]);

  const handleRestart = useCallback(async () => {
    setActionLoading('restart');
    try {
      const res = await fetch('/api/whatsapp/restart', { method: 'POST' });
      if (res.ok) {
        toast.success('Instancia reiniciada!');
        setConnectionState('connecting');
        setTimeout(fetchInstance, 3000);
      } else {
        toast.error('Erro ao reiniciar');
      }
    } catch {
      toast.error('Erro ao reiniciar');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInstance]);

  const copyPairingCode = useCallback(() => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pairingCode]);

  // Poll connection state
  useEffect(() => {
    if (!isOpen) return;
    fetchInstance();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/connection-state');
        if (res.ok) {
          const data = await res.json();
          const newState = data.connected ? 'open' : data.state || 'close';
          if (newState === 'open' && connectionState !== 'open') {
            toast.success('WhatsApp conectado!');
            fetchInstance();
          }
          setConnectionState(newState);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, fetchInstance, connectionState]);

  // QR auto-refresh
  useEffect(() => {
    if (!isOpen || connectionState === 'open') {
      clearInterval(countdownRef.current);
      return;
    }
    setCountdown(QR_REFRESH_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQR();
          return QR_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [isOpen, connectionState, fetchQR]);

  // Fetch QR when disconnected
  useEffect(() => {
    if (isOpen && connectionState !== 'open') {
      fetchQR();
    }
  }, [isOpen, connectionState, fetchQR]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQrImage(null);
      setPairingCode(null);
      setMode('qr');
      setPhoneNumber('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = connectionState === 'open';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-amber-500' : 'bg-gray-500'} text-white`}>
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">WhatsApp — TransObra</h3>
              <p className="text-xs opacity-90">{isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-60px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Instance Info */}
              {instance && (
                <div className="mb-5 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    {instance.profilePicUrl ? (
                      <img src={instance.profilePicUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                        {instance.profileName?.[0] || 'T'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{instance.profileName || 'TransObra'}</p>
                      <p className="text-xs text-gray-500">{instance.ownerJid?.replace('@s.whatsapp.net', '') || 'N/A'}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2">
                      <MessageSquare className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                      <p className="text-xs font-bold text-gray-900">{instance.messages?.toLocaleString() || '0'}</p>
                      <p className="text-[10px] text-gray-500">Mensagens</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <Users className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                      <p className="text-xs font-bold text-gray-900">{instance.contacts || '0'}</p>
                      <p className="text-[10px] text-gray-500">Contatos</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                      <p className="text-xs font-bold text-gray-900">{instance.chats || '0'}</p>
                      <p className="text-[10px] text-gray-500">Conversas</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected Actions */}
              {isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                    <Wifi className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">WhatsApp conectado e funcionando</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleRestart} disabled={actionLoading === 'restart'}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50">
                      {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Reiniciar
                    </button>
                    <button onClick={handleDisconnect} disabled={actionLoading === 'disconnect'}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50">
                      {actionLoading === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                      Desconectar
                    </button>
                  </div>
                </div>
              ) : (
                /* Disconnected: QR / Pairing */
                <div className="space-y-4">
                  {/* Mode Tabs */}
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button onClick={() => setMode('qr')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'qr' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                      QR Code
                    </button>
                    <button onClick={() => setMode('pairing')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'pairing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                      Codigo
                    </button>
                  </div>

                  {mode === 'qr' ? (
                    <div className="text-center">
                      {qrImage ? (
                        <div className="relative inline-block">
                          <img src={qrImage} alt="QR Code WhatsApp" className="w-64 h-64 mx-auto rounded-xl border-2 border-gray-200" />
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> Renova em {countdown}s
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-64 h-64 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-4">
                        Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                      </p>
                      <button onClick={() => { fetchQR(); setCountdown(QR_REFRESH_SECONDS); }}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium">
                        <RefreshCw className="w-4 h-4" /> Renovar QR
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input type="tel" placeholder="(92) 99999-9999" value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchPairingCode()}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                      <button onClick={fetchPairingCode} disabled={actionLoading === 'pairing' || !phoneNumber}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        {actionLoading === 'pairing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        Gerar Codigo de Pareamento
                      </button>
                      {pairingCode && (
                        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                          <p className="text-xs text-green-700 mb-2">Digite este codigo no celular:</p>
                          <p className="text-3xl font-mono font-black text-green-800 tracking-widest">{pairingCode}</p>
                          <button onClick={copyPairingCode}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-green-700 rounded-lg border border-green-300 hover:bg-green-50 transition-colors text-xs font-medium">
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copiado!' : 'Copiar codigo'}
                          </button>
                          <p className="text-[11px] text-green-600 mt-2">
                            WhatsApp → Dispositivos conectados → Link with phone number
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
