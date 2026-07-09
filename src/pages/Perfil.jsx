import { useState, useRef } from 'react';
import { FileText, Download, Calendar, Building2, Wrench, TrendingUp, CheckCircle, Camera, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { supabase, isConfigured } from '../lib/supabase';
import { useContratos } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { generateEntregaPDF } from '../lib/pdfExport';

export default function Perfil() {
  const { user, profile } = useAuth();
  const [activeModal, setActiveModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { data: contratos } = useContratos();
  const { data: comprovantes } = useComprovantes();

  const userName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const userEmail = profile?.email || user?.email || 'admin@transobra.com';
  const userRole = profile?.role || 'funcionario';
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatarUrl || null;

  const myComprovantes = (comprovantes || []).slice(0, 20);
  const myContratos = (contratos || []).slice(0, 10);

  const handleExportPDF = async (comprovante) => {
    try {
      await generateEntregaPDF(comprovante);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem maximo 2MB');
      return;
    }
    setUploading(true);
    try {
      if (!isConfigured()) {
        toast.info('Configure o Supabase para usar foto de perfil');
        return;
      }
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      toast.success('Foto de perfil atualizada!');
      window.location.reload();
    } catch (err) {
      toast.error('Erro ao enviar foto: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  };

  const menuItems = [
    { key: 'relatorio', label: 'Relatorio', icon: TrendingUp },
    { key: 'comprovantes', label: 'Comprovantes', icon: FileText },
    { key: 'contratos', label: 'Contratos', icon: Building2 },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-gray-900">{initials}</span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-70 hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
           <div>
             <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
             <p className="text-sm text-gray-500">{userEmail}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 capitalize">{userRole}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {menuItems.map((item) => (
          <button key={item.key} onClick={() => setActiveModal(item.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeModal === 'relatorio' && (
          <motion.div key="modal-relatorio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp size={16} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Relatorio</h2>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText className="w-5 h-5" /></div>
                      <h4 className="font-semibold text-gray-700">Entregas Realizadas</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(comprovantes || []).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Total de comprovantes registrados</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
                      <h4 className="font-semibold text-gray-700">Assinaturas Digitais</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(comprovantes || []).filter(c => c.assinado).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Documentos assinados digitalmente</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><Building2 className="w-5 h-5" /></div>
                      <h4 className="font-semibold text-gray-700">Contratos Vinculados</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(contratos || []).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Total de contratos no sistema</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t shrink-0">
                <button onClick={() => setActiveModal(null)} className="w-full py-2.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'comprovantes' && (
          <motion.div key="modal-comprovantes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <FileText size={16} className="text-yellow-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Comprovantes de Entrega</h2>
                  <span className="text-sm text-gray-500">({myComprovantes.length})</span>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {myComprovantes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum comprovante encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myComprovantes.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">{c.contrato}</span>
                              <StatusBadge status={c.status} />
                              {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
                            </div>
                            <h4 className="font-semibold text-gray-900 truncate">{c.locatario}</h4>
                            <div className="text-sm text-gray-500 mt-1">
                              {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}</p>}
                              {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
                            </div>
                            {c.itens && c.itens.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">{c.itens.length} item(ns)</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <Button variant="ghost" size="sm" icon={Download} onClick={() => handleExportPDF(c)} className="mt-2">
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t shrink-0">
                <button onClick={() => setActiveModal(null)} className="w-full py-2.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'contratos' && (
          <motion.div key="modal-contratos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Building2 size={16} className="text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Contratos</h2>
                  <span className="text-sm text-gray-500">({myContratos.length})</span>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {myContratos.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum contrato encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myContratos.map((ct) => (
                      <div key={ct.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-mono text-gray-400">{ct.id}</p>
                            <h4 className="font-bold text-gray-900">{ct.cliente}</h4>
                            {ct.cnpj && <p className="text-xs text-gray-500 mt-0.5">CNPJ: {ct.cnpj}</p>}
                          </div>
                          <StatusBadge status={ct.status} />
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-gray-400" />
                            <span>{Array.isArray(ct.equipamentos) ? ct.equipamentos.join(', ') : ct.equipamentos || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{ct.inicio || '-'} a {ct.fim || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-600">R$ {Number(ct.valorMensal || 0).toLocaleString('pt-BR')}/mes</span>
                            <span className="text-gray-500">Total: R$ {Number(ct.valorTotal || 0).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t shrink-0">
                <button onClick={() => setActiveModal(null)} className="w-full py-2.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
