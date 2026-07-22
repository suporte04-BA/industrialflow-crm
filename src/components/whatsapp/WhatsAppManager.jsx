import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Wifi, Loader2, Smartphone, MessageSquare, Users, Clock, Unplug, RotateCcw, Copy, Check, Trash2, QrCode, Link2, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppManager({ isOpen, onClose }) {
  const [instance, setInstance] = useState(null);
  const [status, setStatus] = useState('loading');
  const [qrImage, setQrImage] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [actionLoading, setActionLoading] = useState(null);
  const [mode, setMode] = useState('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const qrFetchedRef = useRef(false);
  const statusRef = useRef('loading');

  const isConnected = status === 'open';
  const isConnecting = status === 'connecting';

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance');
      if (res.ok) {
        const data = await res.json();
        setInstance(data);
        const newStatus = data.status === 'open' ? 'open' : 'close';
        setStatus(newStatus);
        statusRef.current = newStatus;
      } else {
        setInstance(null);
        setStatus('close');
        statusRef.current = 'close';
      }
    } catch {
      setStatus('close');
      statusRef.current = 'close';
    }
  }, []);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/qr');
      if (res.ok) {
        const data = await res.json();
        if (data.base64) setQrImage(data.base64);
        if (data.pairingCode) setPairingCode(data.pairingCode);
        if (data.state && data.state !== 'open') {
          setStatus(data.state);
          statusRef.current = data.state;
        }
        if (data.state === 'open') {
          setStatus('open');
          statusRef.current = 'open';
          toast.success('WhatsApp conectado!');
          fetchInstance();
        }
      }
    } catch { /* ignore */ }
  }, [fetchInstance]);

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
          setCountdown(30);
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
        setStatus('close');
        statusRef.current = 'close';
        setQrImage(null);
        setPairingCode(null);
        qrFetchedRef.current = false;
        fetchInstance();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao desconectar');
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
        setStatus('connecting');
        statusRef.current = 'connecting';
        qrFetchedRef.current = false;
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

  const handleDelete = useCallback(async () => {
    setActionLoading('delete');
    try {
      const res = await fetch('/api/whatsapp/delete', { method: 'POST' });
      if (res.ok) {
        toast.success('Instancia removida!');
        setInstance(null);
        setStatus('close');
        statusRef.current = 'close';
        setQrImage(null);
        setPairingCode(null);
        setConfirmDelete(false);
        qrFetchedRef.current = false;
        fetchInstance();
      } else {
        toast.error('Erro ao remover instancia');
      }
    } catch {
      toast.error('Erro ao remover instancia');
    } finally {
      setActionLoading(null);
    }
  }, [fetchInstance]);

  const handleRefreshQR = useCallback(() => {
    setQrImage(null);
    setPairingCode(null);
    setCountdown(30);
    qrFetchedRef.current = false;
    fetchQR();
  }, [fetchQR]);

  const copyPairingCode = useCallback(() => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pairingCode]);

  // Open: fetch instance data
  useEffect(() => {
    if (!isOpen) return;
    fetchInstance();
    qrFetchedRef.current = false;
    setConfirmDelete(false);
  }, [isOpen, fetchInstance]);

  // Poll connection state every 5s
  useEffect(() => {
    if (!isOpen) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/connection-state');
        if (res.ok) {
          const data = await res.json();
          const newState = data.connected ? 'open' : data.state || 'close';
          if (newState === 'open' && statusRef.current !== 'open') {
            toast.success('WhatsApp conectado!');
            fetchInstance();
          }
          setStatus(newState);
          statusRef.current = newState;
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, fetchInstance]);

  // QR auto-refresh countdown (only when disconnected)
  useEffect(() => {
    if (!isOpen || isConnected) {
      clearInterval(countdownRef.current);
      return;
    }
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [isOpen, isConnected, fetchQR]);

  // Initial QR fetch when disconnected
  useEffect(() => {
    if (isOpen && !isConnected && !qrFetchedRef.current) {
      qrFetchedRef.current = true;
      fetchQR();
    }
  }, [isOpen, isConnected, fetchQR]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQrImage(null);
      setPairingCode(null);
      setMode('qr');
      setPhoneNumber('');
      setCopied(false);
      setConfirmDelete(false);
      qrFetchedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className={`relative px-6 py-5 flex items-center justify-between ${
          isConnected ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
          isConnecting ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
          'bg-gradient-to-r from-gray-500 to-gray-600'
        } text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">WhatsApp — TransObra</h3>
              <p className="text-sm opacity-90">
                {isConnected ? 'Conectado e funcionando' : isConnecting ? 'Conectando...' : 'Desconectado'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
          {isConnected && (
            <div className="absolute top-5 right-14 w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-80px)]">
          {status === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-green-500" />
              <p className="text-sm text-gray-400">Carregando...</p>
            </div>
          ) : (
            <>
              {/* Instance Info Card */}
              {instance && (
                <div className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200/60">
                  <div className="flex items-center gap-4 mb-4">
                    {instance.profilePicUrl ? (
                      <img src={instance.profilePicUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {instance.profileName?.[0] || 'T'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-lg truncate">{instance.profileName || 'TransObra'}</p>
                      <p className="text-sm text-gray-500 font-mono">{instance.ownerJid?.replace('@s.whatsapp.net', '') || 'N/A'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-500">{isConnected ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                      <MessageSquare className="w-5 h-5 mx-auto text-blue-500 mb-1.5" />
                      <p className="text-lg font-bold text-gray-900">{instance.messages?.toLocaleString() || '0'}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Mensagens</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                      <Users className="w-5 h-5 mx-auto text-purple-500 mb-1.5" />
                      <p className="text-lg font-bold text-gray-900">{instance.contacts || '0'}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Contatos</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                      <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1.5" />
                      <p className="text-lg font-bold text-gray-900">{instance.chats || '0'}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Conversas</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected */}
              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Conexao ativa</p>
                      <p className="text-xs text-green-600">Mensagens sendo enviadas normalmente</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleRestart} disabled={actionLoading === 'restart'}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all text-sm font-semibold disabled:opacity-50 border border-blue-100">
                      {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Reiniciar
                    </button>
                    <button onClick={handleDisconnect} disabled={actionLoading === 'disconnect'}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-700 rounded-2xl hover:bg-red-100 transition-all text-sm font-semibold disabled:opacity-50 border border-red-100">
                      {actionLoading === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                      Desconectar
                    </button>
                  </div>
                  {/* Delete Instance */}
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-400 hover:text-red-500 transition-colors text-xs">
                      <Trash2 className="w-3.5 h-3.5" /> Remover instancia
                    </button>
                  ) : (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <p className="text-sm font-semibold text-red-800">Tem certeza?</p>
                      </div>
                      <p className="text-xs text-red-600">Isso vai remover a instancia permanentemente. Sera necessario reconectar com QR code.</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2 text-xs font-medium text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50">
                          Cancelar
                        </button>
                        <button onClick={handleDelete} disabled={actionLoading === 'delete'}
                          className="flex-1 py-2 text-xs font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1">
                          {actionLoading === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Disconnected: QR / Pairing */
                <div className="space-y-5">
                  {/* Mode Tabs */}
                  <div className="flex bg-gray-100 rounded-2xl p-1.5">
                    <button onClick={() => { setMode('qr'); setPairingCode(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        mode === 'qr' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <QrCode className="w-4 h-4" /> QR Code
                    </button>
                    <button onClick={() => { setMode('pairing'); setQrImage(null); qrFetchedRef.current = false; }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        mode === 'pairing' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <Link2 className="w-4 h-4" /> Codigo
                    </button>
                  </div>

                  {mode === 'qr' ? (
                    <div className="text-center space-y-4">
                      {qrImage ? (
                        <div className="relative inline-block">
                          <div className="p-3 bg-white rounded-3xl shadow-lg border border-gray-200 inline-block">
                            <img src={qrImage} alt="QR Code WhatsApp" className="w-72 h-72 rounded-2xl" />
                          </div>
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-md">
                            <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                              <RefreshCw className="w-3.5 h-3.5" /> Atualiza em {countdown}s
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-72 h-72 mx-auto bg-gray-100 rounded-3xl flex flex-col items-center justify-center gap-3 border border-gray-200">
                          <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
                          <p className="text-xs text-gray-400">Gerando QR Code...</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                        Abra o WhatsApp no celular, va em <strong>Dispositivos conectados</strong> e escaneie o codigo
                      </p>
                      <button onClick={handleRefreshQR}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-semibold border border-gray-200">
                        <RefreshCw className="w-4 h-4" /> Renovar QR
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numero do celular</label>
                        <input type="tel" placeholder="(92) 99999-9999" value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && fetchPairingCode()}
                          className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 placeholder-gray-400" />
                      </div>
                      <button onClick={fetchPairingCode} disabled={actionLoading === 'pairing' || !phoneNumber}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25">
                        {actionLoading === 'pairing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        Gerar Codigo de Pareamento
                      </button>
                      {pairingCode && (
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-semibold text-green-800">Codigo de pareamento</p>
                          </div>
                          <p className="text-4xl font-mono font-black text-green-900 tracking-[0.3em] mb-4">{pairingCode}</p>
                          <button onClick={copyPairingCode}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 rounded-xl border border-green-300 hover:bg-green-50 transition-all text-sm font-semibold shadow-sm">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copiado!' : 'Copiar codigo'}
                          </button>
                          <p className="text-xs text-green-600 mt-3">
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

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
