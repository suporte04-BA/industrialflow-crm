import { useState, useRef } from 'react';
import { FileText, Download, Calendar, Building2, Wrench, TrendingUp, CheckCircle, Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { supabase, isConfigured } from '../lib/supabase';
import { useContratos } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import StatusBadge from '../components/ui/StatusBadge';
import { generateEntregaPDF } from '../lib/pdfExport';

export default function Perfil() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
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

  const toggleTab = (key) => setActiveTab(activeTab === key ? null : key);

  const menuItems = [
    { key: 'relatorio', label: 'Relatorio', icon: TrendingUp, color: 'blue' },
    { key: 'comprovantes', label: 'Comprovantes', icon: FileText, color: 'green' },
    { key: 'contratos', label: 'Contratos', icon: Building2, color: 'yellow' },
  ];

  const tabColors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', active: 'bg-blue-500 text-white' },
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', active: 'bg-green-500 text-white' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', active: 'bg-yellow-400 text-gray-900' },
  };

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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
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
        {menuItems.map((item) => {
          const isOpen = activeTab === item.key;
          const colors = tabColors[item.color];
          return (
            <button key={item.key} onClick={() => toggleTab(item.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                isOpen
                  ? `${colors.active} border-transparent shadow-md`
                  : `bg-white text-gray-600 hover:bg-gray-50 border-gray-200`
              }`}>
              <item.icon className="w-4 h-4" />
              {item.label}
              {isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeTab === 'relatorio' && (
          <motion.div key="relatorio"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Relatorio Geral</h3>
                  <p className="text-xs text-gray-500">Resumo das atividades do sistema</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-500">Entregas</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{(comprovantes || []).length}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">comprovantes registrados</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-500">Assinaturas</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{(comprovantes || []).filter(c => c.assinado).length}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">documentos assinados</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-yellow-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-medium text-gray-500">Contratos</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{(contratos || []).length}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">contratos no sistema</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'comprovantes' && (
          <motion.div key="comprovantes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <FileText size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Comprovantes de Entrega</h3>
                    <p className="text-xs text-gray-500">{myComprovantes.length} registro(s)</p>
                  </div>
                </div>
              </div>
              {myComprovantes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum comprovante encontrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {myComprovantes.map((c) => (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.contrato}</span>
                            <StatusBadge status={c.status} />
                            {c.assinado && c.status !== 'assinado' && <StatusBadge status="assinado" />}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{c.locatario}</h4>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {c.endereco && <p className="truncate">{c.endereco}{c.numero ? `, ${c.numero}` : ''}</p>}
                            {c.cidade && <p>{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">R$ {Number(c.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <button onClick={() => handleExportPDF(c)}
                            className="mt-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'contratos' && (
          <motion.div key="contratos"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl border border-yellow-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Building2 size={20} className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Contratos</h3>
                  <p className="text-xs text-gray-500">{myContratos.length} registro(s)</p>
                </div>
              </div>
              {myContratos.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum contrato encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                  {myContratos.map((ct) => (
                    <div key={ct.id} className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{ct.cliente}</h4>
                          {ct.cnpj && <p className="text-[10px] text-gray-400">CNPJ: {ct.cnpj}</p>}
                        </div>
                        <StatusBadge status={ct.status} />
                      </div>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-gray-400" />
                          <span className="truncate">{Array.isArray(ct.equipamentos) ? ct.equipamentos.join(', ') : ct.equipamentos || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{ct.inicio || '-'} a {ct.fim || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                          <span className="font-medium text-green-600">R$ {Number(ct.valorMensal || 0).toLocaleString('pt-BR')}/mes</span>
                          <span className="text-gray-400">Total: R$ {Number(ct.valorTotal || 0).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
