import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Edit3, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrdensServico, useUpdateOS } from '../hooks/useOrdensServico';

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

export default function OSDetailPage() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const { data: osList, isLoading } = useOrdensServico();
  const updateOS = useUpdateOS();

  const os = useCallback(() => (osList || []).find((o) => String(o.id) === String(id)), [osList, id])();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (os) {
      setFormData({
        id: os.id || '',
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatDateTime = () => {
    return new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleBack = () => {
    window.close();
    setTimeout(() => { window.location.href = '/ordens'; }, 200);
  };

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOS.mutateAsync({ id: os.id, updates: { ...formData, valor: Number(formData.valor) || 0 } });
      toast.success('Ordem de Servico atualizada com sucesso!');
      setEditing(false);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !os) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando OS...</p>
        </div>
      </div>
    );
  }

  const osNumber = os.id?.toString().padStart(3, '0') || '000';

  const statusColorClass =
    os.status === 'concluido' ? 'bg-green-100 text-green-700 border-green-300' :
    os.status === 'em_andamento' ? 'bg-blue-100 text-blue-700 border-blue-300' :
    os.status === 'cancelado' ? 'bg-red-100 text-red-700 border-red-300' :
    'bg-yellow-100 text-yellow-700 border-yellow-300';

  const prioridadeColorClass =
    prioridadeLabels[os.prioridade] === 'Urgente' ? 'bg-red-100 text-red-700 border-red-300' :
    prioridadeLabels[os.prioridade] === 'Alta' ? 'bg-orange-100 text-orange-700 border-orange-300' :
    'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            <ArrowLeft size={18} /> Voltar para TransObra
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Edit3 size={14} /> Editar
              </button>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-gray-800 transition-colors">
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#111827] px-6 sm:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src="/logo.jpg" alt="TransObra" className="h-12 w-auto brightness-200" />
                <div className="hidden sm:block w-px h-10 bg-white/20" />
                <div>
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Ordem de Servico</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">OS-{osNumber}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColorClass}`}>
                  {statusLabels[os.status] || os.status}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${prioridadeColorClass}`}>
                  {prioridadeLabels[os.prioridade] || os.prioridade}
                </span>
              </div>
            </div>
            <div className="h-1 bg-[#EAB308] mt-4 rounded-full"></div>
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-6">
            <Section title="Dados da Ordem de Servico">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoField label="Codigo da OS" value={<span className="font-mono font-bold text-yellow-600">{os.id}</span>} />
                <InfoField label="Tipo de Servico" value={editing ? (
                  <EditInput value={formData.tipo} onChange={(v) => setFormData({...formData, tipo: v})} />
                ) : os.tipo || '-'} />
                <InfoField label="Equipamento" value={editing ? (
                  <EditInput value={formData.equipamento} onChange={(v) => setFormData({...formData, equipamento: v})} />
                ) : os.equipamento || '-'} />
              </div>
            </Section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Section title="Dados do Cliente">
                <div className="space-y-3">
                  <InfoField label="Cliente" value={editing ? (
                    <EditInput value={formData.cliente} onChange={(v) => setFormData({...formData, cliente: v})} />
                  ) : os.cliente || '-'} />
                  <InfoField label="Tecnico / Fornecedor" value={editing ? (
                    <EditInput value={formData.tecnico} onChange={(v) => setFormData({...formData, tecnico: v})} />
                  ) : os.tecnico || '-'} />
                  <InfoField label="Data de Abertura" value={formatDate(os.abertura)} />
                  <InfoField label="Previsao de Conclusao" value={editing ? (
                    <input type="date" value={formData.previsao} onChange={(e) => setFormData({...formData, previsao: e.target.value})}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                  ) : formatDate(os.previsao)} />
                </div>
              </Section>

              <Section title="Valor e Status" highlight>
                <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200 mb-4">
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-1">Valor Total da OS</p>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-yellow-700">R$</span>
                      <input type="number" value={formData.valor} onChange={(e) => setFormData({...formData, valor: Number(e.target.value)})}
                        className="flex-1 text-2xl font-bold text-yellow-700 bg-white border border-yellow-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                    </div>
                  ) : (
                    <p className="text-3xl sm:text-4xl font-bold text-yellow-700">R$ {Number(os.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Status Atual</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColorClass}`}>
                      {statusLabels[os.status] || os.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Prioridade</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${prioridadeColorClass}`}>
                      {prioridadeLabels[os.prioridade] || os.prioridade}
                    </span>
                  </div>
                </div>
              </Section>
            </div>

            <Section title="Descricao do Servico / Observacoes">
              {editing ? (
                <textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40 resize-vertical"
                  placeholder="Descreva o servico a ser realizado..." />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {os.observacoes || 'Nenhuma descricao ou observacao registrada para esta Ordem de Servico.'}
                </p>
              )}
            </Section>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Resumo Geral</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <ResumoItem label="Status" value={statusLabels[os.status] || os.status}
                  color={os.status === 'concluido' ? 'text-green-600' : os.status === 'pendente' ? 'text-yellow-600' : 'text-gray-700'} />
                <ResumoItem label="Prioridade" value={prioridadeLabels[os.prioridade] || os.prioridade}
                  color={os.prioridade === 'urgente' ? 'text-red-600' : os.prioridade === 'alta' ? 'text-orange-600' : 'text-gray-700'} />
                <ResumoItem label="Abertura" value={formatDate(os.abertura)} color="text-gray-700" />
                <ResumoItem label="Previsao" value={formatDate(os.previsao)} color="text-gray-700" />
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="TransObra" className="h-5 w-auto opacity-60" />
              <span className="text-[10px] text-gray-400">TRANSOBRA - Gestao de Locacao de Equipamentos</span>
            </div>
            <span className="text-[10px] text-gray-400">Gerado em {formatDateTime()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'border-yellow-200 bg-yellow-50/50' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${highlight ? 'text-yellow-700' : 'text-gray-400'}`}>{title}</p>
      {children}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-gray-800">{value || '-'}</div>
    </div>
  );
}

function EditInput({ value, onChange }) {
  return (
    <input value={value || ''} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
  );
}

function ResumoItem({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}