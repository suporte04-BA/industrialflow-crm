import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Trash2, Plus, X, Loader2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useDevolucoes, useCreateDevolucao, useDeleteDevolucao } from '../hooks/useDevolucoes';
import { useComprovantes } from '../hooks/useComprovantes';
import { generateDevolucaoPDF } from '../lib/pdfExport';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

const EMPTY_FORM = {
  comprovanteId: '',
  locatario: '',
  cnpjLocatario: '',
  cpfSignatario: '',
  rgSignatario: '',
  signatarioNome: '',
  localObra: '',
  referencia: '',
  cidade: '',
  estado: '',
  cep: '',
  telefone: '',
  endereco: '',
  bairro: '',
  itens: [],
  condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
  metodoEntrega: 'locadora_entrega',
};

export default function DevolucaoEntrega() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const devCounterRef = useRef(100000);

  const { data: devolucoes, isLoading, isError, error, refetch } = useDevolucoes();
  const { data: comprovantes } = useComprovantes();
  const createDevolucao = useCreateDevolucao();
  const deleteDevolucao = useDeleteDevolucao();

  const assinados = (comprovantes || []).filter((c) => c.assinado && c.status === 'assinado');

  const filteredDevolucoes = (devolucoes || []).filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.locatario || '').toLowerCase().includes(term) ||
      (d.numero || '').toLowerCase().includes(term) ||
      (d.signatarioNome || '').toLowerCase().includes(term)
    );
  });

  const handleComprovanteSelect = (compId) => {
    const comp = assinados.find((c) => c.id === compId);
    if (!comp) return;
    setForm({
      comprovanteId: comp.id,
      locatario: comp.locatario || '',
      cnpjLocatario: comp.cnpjLocatario || comp.cpf || '',
      cpfSignatario: comp.cpfSignatario || '',
      rgSignatario: comp.rgSignatario || comp.rg || '',
      signatarioNome: comp.signatarioNome || comp.nomeSignatario || '',
      localObra: comp.localEntrega || '',
      referencia: comp.referencia || '',
      cidade: comp.cidade || '',
      estado: comp.estado || '',
      cep: comp.cep || '',
      telefone: comp.telefone || '',
      endereco: comp.endereco || '',
      bairro: comp.bairro || '',
      itens: (comp.itens || []).map((it) => ({
        patrimonio: it.patrimonio || '',
        descricao: it.descricao || '',
        quantidade: it.quantidade || 1,
        qtdDevolvida: it.quantidade || 1,
        qtdFaltante: 0,
      })),
      condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
      metodoEntrega: comp.metodoEntrega || 'locadora_entrega',
    });
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    return () => {
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing]);

  const handleSave = async () => {
    if (!form.comprovanteId) { toast.error('Selecione um comprovante de entrega'); return; }
    if (!form.signatarioNome.trim()) { toast.error('Preencha o nome do signatario'); return; }
    if (!form.cpfSignatario.trim()) { toast.error('Preencha o CPF/CNPJ do signatario'); return; }

    const canvas = canvasRef.current;
    const hasSignature = canvas && canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasSignature) { toast.error('Faca a assinatura de quem recebeu o equipamento'); return; }

    setSaving(true);
    try {
      const assinaturaImagem = canvas.toDataURL('image/png');
      const now = new Date();
      const devolucao = {
        ...form,
        numero: `DEV-${String(devCounterRef.current++).slice(-6)}`,
        atendente: 'Edson Junio Paiva',
        data: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
        hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        condicoes: form.condicoes,
        assinaturaImagem,
        status: 'devolvido',
      };

      const saved = await createDevolucao.mutateAsync(devolucao);
      toast.success('Devolucao registrada com sucesso!');
      setShowForm(false);
      setForm(EMPTY_FORM);
      clearCanvas();

      try {
        await generateDevolucaoPDF({ ...devolucao, id: saved.id });
      } catch { /* PDF generation is optional */ }
    } catch {
      toast.error('Erro ao registrar devolucao');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDevolucao.mutateAsync(deleteTarget.id);
      toast.success('Devolucao excluida!');
      setDeleteTarget(null);
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const [saving, setSaving] = useState(false);

  if (isLoading) return <div className="p-4 sm:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 sm:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-4 px-3 sm:px-0 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Devolucoes</h2>
          <p className="text-sm text-gray-500">{(devolucoes || []).length} devolucoes registradas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-yellow-400 text-[#1C1C1C] font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors">
          <Plus className="w-4 h-4" /> Nova Devolucao
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por locatario, numero, signatario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-base pl-9 w-full" />
        </div>
      </div>

      {(devolucoes || []).length === 0 ? (
        <EmptyState icon={PackageCheck} title="Nenhuma devolucao" description="Registre uma devolucao a partir de um comprovante de entrega assinado." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredDevolucoes.map((d) => {
            const isExpanded = expandedId === d.id;
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{d.numero}</span>
                      <StatusBadge status={d.status} />
                      <button onClick={() => setExpandedId(isExpanded ? null : d.id)} className="text-xs text-blue-600 hover:text-blue-700">
                        {isExpanded ? 'Ocultar' : 'Detalhes'}
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{d.locatario}</h3>
                    <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                      {d.localObra && <p className="truncate">{d.localObra}</p>}
                      {d.signatarioNome && <p>Signatario: {d.signatarioNome}</p>}
                      {d.data && <p>{d.data} {d.hora}</p>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => { setDeleteTarget(d); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Contrato:</span> <span className="font-medium">{d.contratoId || '-'}</span></div>
                      <div><span className="text-gray-500">Atendente:</span> <span className="font-medium">{d.atendente || '-'}</span></div>
                      <div><span className="text-gray-500">Referencia:</span> <span className="font-medium">{d.referencia || '-'}</span></div>
                      <div><span className="text-gray-500">Cidade:</span> <span className="font-medium">{d.cidade}/{d.estado}</span></div>
                      <div><span className="text-gray-500">Metodo:</span> <span className="font-medium">{d.metodoEntrega === 'cliente_retirada' ? 'Cliente retira' : 'Locadora entrega'}</span></div>
                      <div><span className="text-gray-500">CPF Signatario:</span> <span className="font-medium">{d.cpfSignatario || '-'}</span></div>
                    </div>
                    {d.itens && d.itens.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Itens Devolvidos</p>
                        {d.itens.map((it, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span>{it.quantidade}x</span>
                            <span>{it.descricao}</span>
                            <span className="text-gray-400">({it.patrimonio})</span>
                            {it.qtdFaltante > 0 && <span className="text-red-500">Faltante: {it.qtdFaltante}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {d.condicoes && (d.condicoes.danificado || d.condicoes.extraviado || d.condicoes.testarEmpresa) && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold text-gray-500">Condicoes: </span>
                        {d.condicoes.danificado && <span className="text-orange-600">Danificado/Sujo </span>}
                        {d.condicoes.extraviado && <span className="text-red-600">Extraviado/Roubado </span>}
                        {d.condicoes.testarEmpresa && <span className="text-blue-600">Testar na empresa </span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Nova Devolucao</h3>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); clearCanvas(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Comprovante de Entrega Assinado *</label>
                <select value={form.comprovanteId} onChange={(e) => handleComprovanteSelect(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40">
                  <option value="">Selecione...</option>
                  {assinados.map((c) => (
                    <option key={c.id} value={c.id}>{c.contrato} - {c.locatario} ({c.numero})</option>
                  ))}
                </select>
              </div>

              {form.comprovanteId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Locatario</label>
                      <input value={form.locatario} readOnly className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">CNPJ/CPF Locatario</label>
                      <input value={form.cnpjLocatario} readOnly className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium">Local da Obra *</label>
                    <input value={form.localObra} onChange={(e) => setForm({ ...form, localObra: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Nome Signatario *</label>
                      <input value={form.signatarioNome} onChange={(e) => setForm({ ...form, signatarioNome: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">CPF/CNPJ Signatario *</label>
                      <input value={form.cpfSignatario} onChange={(e) => setForm({ ...form, cpfSignatario: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                    </div>
                  </div>

                  {form.itens.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Itens</label>
                      {form.itens.map((it, i) => (
                        <div key={i} className="flex items-center gap-2 mt-1 text-sm">
                          <input type="checkbox" checked={it.qtdDevolvida > 0} onChange={(e) => {
                            const newItens = [...form.itens];
                            newItens[i] = { ...newItens[i], qtdDevolvida: e.target.checked ? newItens[i].quantidade : 0, qtdFaltante: e.target.checked ? 0 : newItens[i].quantidade };
                            setForm({ ...form, itens: newItens });
                          }} className="w-4 h-4" />
                          <span className="flex-1">{it.quantidade}x {it.descricao} ({it.patrimonio})</span>
                          {!it.qtdDevolvida && (
                            <span className="text-xs text-red-500">FALTANTE</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-500 font-medium">Condicoes</label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.condicoes.danificado} onChange={(e) => setForm({ ...form, condicoes: { ...form.condicoes, danificado: e.target.checked } })} className="w-4 h-4" />
                        Danificado/Sujo
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.condicoes.extraviado} onChange={(e) => setForm({ ...form, condicoes: { ...form.condicoes, extraviado: e.target.checked } })} className="w-4 h-4" />
                        Extraviado/Roubado
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.condicoes.testarEmpresa} onChange={(e) => setForm({ ...form, condicoes: { ...form.condicoes, testarEmpresa: e.target.checked } })} className="w-4 h-4" />
                        Testar na empresa
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium">Assinatura de Quem Recebeu *</label>
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                      <canvas ref={canvasRef} width={400} height={150} className="w-full cursor-crosshair bg-white" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} />
                    </div>
                    <button type="button" onClick={clearCanvas} className="mt-1 text-xs text-gray-500 hover:text-gray-700">Limpar assinatura</button>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); clearCanvas(); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-yellow-400 text-[#1C1C1C] font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 disabled:opacity-50">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {saving ? 'Salvando...' : 'Registrar Devolucao'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Excluir Devolucao" message={`Excluir devolucao ${deleteTarget?.numero}?`} confirmLabel="Excluir" danger />
    </div>
  );
}
