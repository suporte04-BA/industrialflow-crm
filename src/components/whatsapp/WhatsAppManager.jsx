import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Wifi, Loader2, Smartphone, MessageSquare, Users, Clock, Unplug, RotateCcw, Copy, Check, Trash2, QrCode, Link2, AlertTriangle, Shield, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppManager({ isOpen, onClose }) {
  const [instance, setInstance] = useState(null);
  const [status, setStatus] = useState('loading');
  const [qrImage, setQrImage] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [actionLoading, setActionLoading] = useState(null);
  const [mode, setMode] = useState('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState('main');

  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const connectLockRef = useRef(false);
  const statusRef = useRef('loading');

  const isConnected = status === 'open';
  const isConnecting = status === 'connecting';
  const hasInstance = !!instance;

  // Fetch instance info
  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance');
      if (res.ok) {
        const data = await res.json();
        setInstance(data);
        const newStatus = data.status === 'open' ? 'open' : data.status === 'connecting' ? 'connecting' : 'close';
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

  // Main connect flow: delete stale → create fresh → return QR
  const handleConnect = useCallback(async () => {
    if (connectLockRef.current) return;
    connectLockRef.current = true;
    setActionLoading('connect');
    try {
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();

      if (data.state === 'open') {
        toast.success('WhatsApp ja esta conectado!');
        setStatus('open');
        statusRef.current = 'open';
        setQrImage(null);
        fetchInstance();
      } else if (data.qrcode) {
        setQrImage(data.qrcode);
        setCountdown(60);
        setStatus('connecting');
        statusRef.current = 'connecting';
      } else {
        toast.error('Nao foi possivel gerar QR Code');
      }
    } catch {
      toast.error('Erro ao conectar');
    } finally {
      setActionLoading(null);
      connectLockRef.current = false;
    }
  }, [fetchInstance]);

  // Pairing code flow
  const handlePairingCode = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Digite um numero valido com DDD');
      return;
    }
    setActionLoading('pairing');
    try {
      const clean = phoneNumber.replace(/\D/g, '');
      const number = clean.startsWith('55') ? clean : '55' + clean;
      const res = await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      });
      const data = await res.json();
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setQrImage(null);
        setCountdown(60);
        toast.success('Codigo gerado!');
      } else if (data.state === 'open') {
        toast.success('Ja conectado!');
        fetchInstance();
      } else {
        toast.error('Nao foi possivel gerar o codigo. Tente o QR Code.');
      }
    } catch {
      toast.error('Erro ao gerar codigo');
    } finally {
      setActionLoading(null);
    }
  }, [phoneNumber, fetchInstance]);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    setActionLoading('disconnect');
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        toast.success('Desconectado!');
        setStatus('close');
        statusRef.current = 'close';
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

  // Restart
  const handleRestart = useCallback(async () => {
    setActionLoading('restart');
    try {
      const res = await fetch('/api/whatsapp/restart', { method: 'POST' });
      if (res.ok) {
        toast.success('Reiniciado!');
        setStatus('connecting');
        statusRef.current = 'connecting';
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

  // Delete instance
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
        setView('main');
        connectLockRef.current = false;
      } else {
        toast.error('Erro ao remover');
      }
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Manual QR refresh
  const handleRefreshQR = useCallback(() => {
    setQrImage(null);
    setPairingCode(null);
    connectLockRef.current = false;
    handleConnect();
  }, [handleConnect]);

  // Copy pairing code
  const copyPairingCode = useCallback(() => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pairingCode]);

  // On modal open: fetch instance + auto-connect if disconnected
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    setView('main');
    setPairingCode(null);
    setPhoneNumber('');
    setCopied(false);

    fetchInstance().then(() => {
      // After fetching instance, if not connected, auto-connect
      setTimeout(() => {
        if (statusRef.current !== 'open') {
          handleConnect();
        }
      }, 500);
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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
      } catch {}
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, fetchInstance]);

  // QR countdown: 60s, auto-refresh
  useEffect(() => {
    if (!isOpen || isConnected || view !== 'main') {
      clearInterval(countdownRef.current);
      return;
    }
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          connectLockRef.current = false;
          handleConnect();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [isOpen, isConnected, handleConnect, view]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQrImage(null);
      setPairingCode(null);
      setMode('qr');
      setPhoneNumber('');
      setCopied(false);
      setConfirmDelete(false);
      setView('main');
      connectLockRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header WhatsApp Style */}
        <div className="relative bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {view !== 'main' && (
                <button onClick={() => { setView('main'); connectLockRef.current = false; }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors -ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">WhatsApp TransObra</h3>
                <p className="text-sm opacity-90">
                  {!hasInstance ? 'Nenhuma instancia' : isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isConnected && (
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-xs font-medium">Online</span>
                </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-80px)]">
          {status === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#25D366]" />
              <p className="text-sm text-gray-400">Carregando...</p>
            </div>
          ) : view === 'manage' ? (
            /* Manage View: Delete Instance */
            <div className="space-y-5">
              <div className="p-5 bg-red-50 rounded-2xl border border-red-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">Remover Instancia</p>
                    <p className="text-sm text-red-600">Acao irreversivel</p>
                  </div>
                </div>
                <p className="text-sm text-red-700 mb-4">
                  Isso vai apagar a instancia <strong>transobras</strong> permanentemente.
                  Todas as configuracoes e historico de conexao serao perdidos.
                  Sera necessario criar uma nova instancia e reconectar com QR code.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setView('main')}
                    className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleDelete} disabled={actionLoading === 'delete'}
                    className="flex-1 py-3 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                    {actionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirmar exclusao
                  </button>
                </div>
              </div>
            </div>
          ) : !hasInstance ? (
            /* No Instance: Auto-connect will trigger, show loading */
            <div className="text-center py-8 space-y-5">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-3xl flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-gray-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhuma instancia WhatsApp</h3>
                <p className="text-sm text-gray-500">Crie uma instancia para comecar a enviar mensagens</p>
              </div>
              <button onClick={handleConnect} disabled={actionLoading === 'connect'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50">
                {actionLoading === 'connect' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Criar e Conectar
              </button>
            </div>
          ) : (
            <>
              {/* Instance Info Card */}
              <div className="mb-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  {instance.profilePicUrl ? (
                    <img src={instance.profilePicUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {instance.profileName?.[0] || 'T'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg truncate">{instance.profileName || 'TransObra'}</p>
                    <p className="text-sm text-gray-500 font-mono">{instance.ownerJid?.replace('@s.whatsapp.net', '') || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isConnected ? 'bg-green-100 text-green-700' : isConnecting ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isConnected ? 'Online' : isConnecting ? 'Conectando' : 'Offline'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                    <MessageSquare className="w-5 h-5 mx-auto text-[#25D366] mb-1.5" />
                    <p className="text-lg font-bold text-gray-900">{instance.messages?.toLocaleString() || '0'}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Mensagens</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                    <Users className="w-5 h-5 mx-auto text-[#128C7E] mb-1.5" />
                    <p className="text-lg font-bold text-gray-900">{instance.contacts || '0'}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Contatos</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                    <Clock className="w-5 h-5 mx-auto text-[#075E54] mb-1.5" />
                    <p className="text-lg font-bold text-gray-900">{instance.chats || '0'}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Conversas</p>
                  </div>
                </div>
              </div>

              {/* Connected Actions */}
              {isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Conexao ativa</p>
                      <p className="text-xs text-green-600">Pronto para enviar mensagens</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleRestart} disabled={actionLoading === 'restart'}
                      className="flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all text-sm font-semibold disabled:opacity-50 border border-blue-100">
                      {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Reiniciar
                    </button>
                    <button onClick={handleDisconnect} disabled={actionLoading === 'disconnect'}
                      className="flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 text-red-700 rounded-2xl hover:bg-red-100 transition-all text-sm font-semibold disabled:opacity-50 border border-red-100">
                      {actionLoading === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                      Desconectar
                    </button>
                  </div>
                  <button onClick={() => setView('manage')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-400 hover:text-red-500 transition-colors text-xs font-medium">
                    <Trash2 className="w-3.5 h-3.5" /> Gerenciar instancia
                  </button>
                </div>
              ) : (
                /* Disconnected: QR / Pairing */
                <div className="space-y-5">
                  <div className="flex bg-gray-100 rounded-2xl p-1.5">
                    <button onClick={() => { setMode('qr'); setPairingCode(null); connectLockRef.current = false; }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        mode === 'qr' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <QrCode className="w-4 h-4" /> QR Code
                    </button>
                    <button onClick={() => { setMode('pairing'); setQrImage(null); connectLockRef.current = false; }}
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
                          <div className="p-4 bg-white rounded-3xl shadow-lg border border-gray-200 inline-block">
                            <img src={qrImage} alt="QR Code" className="w-72 h-72 rounded-2xl" />
                          </div>
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-md">
                            <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                              <RefreshCw className="w-3.5 h-3.5" /> {countdown}s
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-72 h-72 mx-auto bg-gray-100 rounded-3xl flex flex-col items-center justify-center gap-3 border border-gray-200">
                          <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
                          <p className="text-xs text-gray-400">Gerando QR Code...</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Abra o WhatsApp, va em <strong>Dispositivos conectados</strong> e escaneie
                      </p>
                      <button onClick={handleRefreshQR} disabled={actionLoading === 'connect'}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-semibold border border-gray-200 disabled:opacity-50">
                        {actionLoading === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Renovar QR
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Numero do celular</label>
                        <input type="tel" placeholder="(92) 99999-9999" value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handlePairingCode()}
                          className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent bg-gray-50 placeholder-gray-400" />
                      </div>
                      <button onClick={handlePairingCode} disabled={actionLoading === 'pairing' || !phoneNumber}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-2xl hover:shadow-lg hover:shadow-green-500/25 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                        {actionLoading === 'pairing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        Gerar Codigo de Pareamento
                      </button>
                      {pairingCode && (
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-[#25D366]" />
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
