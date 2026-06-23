import { useState } from 'react';
import { FileText, Download, Calendar, Building2, Wrench, Eye, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { useContratos } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { generateComprovantePDF } from '../lib/pdfExport';

export default function Perfil() {
  const { user, profile, viewRole, setViewRole } = useAuth();
  const [activeTab, setActiveTab] = useState('comprovantes');
  const { data: contratos } = useContratos();
  const { data: comprovantes } = useComprovantes();

  const userName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const userEmail = profile?.email || user?.email || 'admin@transobra.com';
  const userRole = profile?.role || 'gestor';
  const currentView = viewRole || userRole;
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const myComprovantes = (comprovantes || []).slice(0, 20);
  const myContratos = (contratos || []).slice(0, 10);

  const handleExportPDF = async (comprovante) => {
    try {
      await generateComprovantePDF(comprovante);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-gray-900">{initials}</span>
          </div>
           <div>
             <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
             <p className="text-sm text-gray-500">{userEmail}</p>
             <div className="flex items-center gap-2 mt-1">
               <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 capitalize">{userRole}</span>
               {userRole === 'gestor' && (
                 <button
                   onClick={() => setViewRole(currentView === 'funcionario' ? null : 'funcionario')}
                   className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                 >
                   <Eye className="w-3 h-3" />
                   {currentView === 'funcionario' ? 'Ver como Gestor' : 'Ver como Funcionario'}
                 </button>
               )}
             </div>
           </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'relatorio', label: 'Relatorio', icon: TrendingUp },
          { key: 'comprovantes', label: 'Comprovantes', icon: FileText },
          { key: 'contratos', label: 'Contratos', icon: Building2 },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-yellow-400 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'relatorio' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText className="w-5 h-5" /></div>
              <h4 className="font-semibold text-gray-700">Entregas Realizadas</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">{(comprovantes || []).length}</p>
            <p className="text-xs text-gray-500 mt-1">Total de comprovantes registrados</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
              <h4 className="font-semibold text-gray-700">Assinaturas Digitais</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">{(comprovantes || []).filter(c => c.assinado).length}</p>
            <p className="text-xs text-gray-500 mt-1">Documentos assinados digitalmente</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><Building2 className="w-5 h-5" /></div>
              <h4 className="font-semibold text-gray-700">Contratos Vinculados</h4>
            </div>
            <p className="text-3xl font-bold text-gray-900">{(contratos || []).length}</p>
            <p className="text-xs text-gray-500 mt-1">Total de contratos no sistema</p>
          </div>
        </div>
      )}

      {activeTab === 'comprovantes' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Comprovantes de Entrega</h3>
          {myComprovantes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum comprovante encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {myComprovantes.map((c) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{c.contrato}</span>
                        <StatusBadge status={c.status} />
                        {c.assinado && <StatusBadge status="assinado" />}
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
      )}

      {activeTab === 'contratos' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Contratos</h3>
          {myContratos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum contrato encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myContratos.map((ct) => (
                <div key={ct.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
      )}
    </div>
  );
}
