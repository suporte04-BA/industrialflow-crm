import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrdensServico, useUpdateOS } from '../hooks/useOrdensServico';
import StatusBadge from '../components/ui/StatusBadge';

const BRAND = {
  preto: '#111827',
  amarelo: '#EAB308',
  amareloClaro: '#FEF3C7',
  cinzaFundo: '#F9FAFB',
  cinzaBorda: '#D1D5DB',
  cinzaTexto: '#6B7280',
};

const statusLabels = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
};

const prioridadeLabels = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export default function OSPrintPage() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const { data: osList } = useOrdensServico();
  const updateOS = useUpdateOS();

  const os = (osList || []).find((o) => String(o.id) === String(id));

  useEffect(() => {
    if (os) {
      setFormData({
        cliente: os.cliente || '',
        equipamento: os.equipamento || '',
        tipo: os.tipo || '',
        status: os.status || 'pendente',
        prioridade: os.prioridade || 'normal',
        tecnico: os.tecnico || '',
        abertura: os.abertura || '',
        previsao: os.previsao || '',
        valor: os.valor || 0,
        observacoes: os.observacoes || '',
      });
    }
  }, [os]);

  const handlePrint = () => window.print();

  const handleVoltar = () => {
    window.close();
  };

  const handleSave = async () => {
    try {
      await updateOS.mutateAsync({ id: os.id, updates: formData });
      toast.success('Ordem de Servico atualizada com sucesso!');
      setEditing(false);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  if (!os) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Carregando OS...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatDateFull = () => {
    return new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={handleVoltar}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Edit3 size={14} /> Editar
              </button>
            ) : (
              <>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                  Salvar
                </button>
              </>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-[#111827] px-6 sm:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src="/logo.jpg" alt="TransObra" className="h-10 w-auto brightness-200" />
              </div>
              <div className="text-right">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">OS-{os.id?.toString().padStart(3, '0')}</h1>
                <div className="flex items-center gap-2 justify-end mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                    os.status === 'concluido' ? 'bg-green-100 text-green-700 border-green-300' :
                    os.status === 'em_andamento' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                    os.status === 'cancelado' ? 'bg-red-100 text-red-700 border-red-300' :
                    'bg-yellow-100 text-yellow-700 border-yellow-300'
                  }`}>{statusLabels[os.status] || os.status}</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    prioridadeLabels[os.prioridade] === 'Urgente' ? 'bg-red-100 text-red-700' :
                    prioridadeLabels[os.prioridade] === 'Alta' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{prioridadeLabels[os.prioridade] || os.prioridade}</span>
                </div>
              </div>
            </div>
            <div className="h-1 bg-[#EAB308] mt-4 rounded-full"></div>
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Section title="Dados da OS">
                <InfoField label="DATA DE ABERTURA" value={formatDate(os.abertura)} />
                <InfoField label="TECNICO / FORNECEDOR" value={editing ? (
                  <input value={formData.tecnico} onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                ) : os.tecnico || '-'} />
                <InfoField label="EQUIPAMENTO" value={editing ? (
                  <input value={formData.equipamento} onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                ) : os.equipamento || '-'} />
                <InfoField label="TIPO DE SERVICO" value={editing ? (
                  <input value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                ) : os.tipo || '-'} />
              </Section>

              <Section title="Valor da OS" highlight>
                <div className="bg-blue-600 rounded-xl p-6 text-center">
                  <p className="text-blue-200 text-sm font-medium mb-1">Valor Total</p>
                  {editing ? (
                    <input type="number" value={formData.valor} onChange={(e) => setFormData({...formData, valor: Number(e.target.value)})}
                      className="w-full text-center text-3xl font-bold text-white bg-blue-700 border-none rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40" />
                  ) : (
                    <p className="text-3xl sm:text-4xl font-bold text-white">R$ {Number(os.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
              </Section>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Section title="Dados do Cliente">
                <InfoField label="CLIENTE" value={editing ? (
                  <input value={formData.cliente} onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                ) : os.cliente || '-'} />
                <InfoField label="DATA PREVISTA" value={formatDate(os.previsao)} />
                {editing && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">DATA PREVISTA</p>
                    <input type="date" value={formData.previsao} onChange={(e) => setFormData({...formData, previsao: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                  </div>
                )}
              </Section>

              <Section title="Descricao do Servico">
                {editing ? (
                  <textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40 min-h-[80px]" />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">{os.observacoes || 'Nenhuma observacao registrada.'}</p>
                )}
              </Section>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">Resumo</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="text-sm font-bold text-gray-800">{statusLabels[os.status] || os.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Prioridade</p>
                  <p className="text-sm font-bold text-gray-800">{prioridadeLabels[os.prioridade] || os.prioridade}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Abertura</p>
                  <p className="text-sm font-bold text-gray-800">{formatDate(os.abertura)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Previsao</p>
                  <p className="text-sm font-bold text-gray-800">{formatDate(os.previsao)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center text-[10px] text-gray-400">
              <span>TRANSOBRA CRM - Gestao de Locacao de Equipamentos</span>
              <span>Gerado em {formatDateFull()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50'}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${highlight ? 'text-blue-600' : 'text-gray-400'}`}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
