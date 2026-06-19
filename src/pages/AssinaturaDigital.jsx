import { useState, useRef, useEffect } from 'react';
import { Eraser, Save, Loader2, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAssinaturas, useCreateAssinatura } from '../hooks/useAssinaturas';
import { useComprovantes, useUpdateComprovante } from '../hooks/useComprovantes';
import { useContratos, useUpdateContrato } from '../hooks/useContratos';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import { formatDateBR } from '../lib/dates';
import { isConfigured } from '../lib/supabase';

export default function AssinaturaDigital() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedComprovante, setSelectedComprovante] = useState('');
  const [nomeSignatario, setNomeSignatario] = useState('');
  const [cpfSignatario, setCpfSignatario] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('gestores@transobra.com.br');

  const { data: assinaturas, isLoading, isError, error, refetch } = useAssinaturas();
  const { data: comprovantes, refetch: refetchComprovantes } = useComprovantes();
  const { data: contratos } = useContratos();
  const createAssinatura = useCreateAssinatura();
  const updateComprovante = useUpdateComprovante();
  const updateContrato = useUpdateContrato();

  useEffect(() => {
    refetchComprovantes();
  }, [refetchComprovantes]);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => { if (cfg.emailRecipient) setEmailRecipient(cfg.emailRecipient); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    setIsDrawing(true);
    setHasSignature(true);
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
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const sendEmailNotification = async (contrato, comprovante, signatario) => {
    if (!isConfigured()) return;
    setSendingEmail(true);
    try {
      const emailData = {
        contrato_id: contrato?.id || null,
        comprovante_id: comprovante?.id || null,
        destinatario: emailRecipient,
        assunto: `Contrato ${contrato?.id || comprovante?.contrato} assinado - ${comprovante?.locatario || contrato?.cliente}`,
        corpo: JSON.stringify({
          contrato: contrato ? {
            id: contrato.id,
            cliente: contrato.cliente,
            cnpj: contrato.cnpj,
            equipamentos: contrato.equipamentos,
            inicio: contrato.inicio,
            fim: contrato.fim,
            valorMensal: contrato.valorMensal,
            valorTotal: contrato.valorTotal,
          } : null,
          comprovante: {
            id: comprovante?.id,
            contrato: comprovante?.contrato,
            locatario: comprovante?.locatario,
            endereco: comprovante?.endereco,
            cidade: comprovante?.cidade,
            total: comprovante?.total,
          },
          signatario: {
            nome: signatario,
            data: new Date().toISOString(),
          },
        }),
        status: 'pendente',
      };

      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
    } catch {
      // Email failure is non-blocking
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSave = async () => {
    if (!selectedComprovante) { toast.error('Selecione um comprovante'); return; }
    if (!nomeSignatario) { toast.error('Preencha o nome do signatario'); return; }
    if (!hasSignature) { toast.error('Faca sua assinatura'); return; }
    setSaving(true);
    try {
      const imagem = canvasRef.current.toDataURL('image/png');
      await createAssinatura.mutateAsync({
        comprovanteId: selectedComprovante,
        nomeSignatario,
        cpfSignatario,
        assinaturaImagem: imagem,
      });

      const comp = (comprovantes || []).find((c) => c.id === selectedComprovante);
      if (comp) {
        await updateComprovante.mutateAsync({
          id: comp.id,
          updates: { assinado: true, status: 'assinado', nomeSignatario: nomeSignatario, dataAssinatura: new Date().toISOString() },
        });

        if (comp.contratoId) {
          const ct = (contratos || []).find((c) => c.id === comp.contratoId);
          if (ct) {
            await updateContrato.mutateAsync({ id: ct.id, updates: { assinado: true } });
            await sendEmailNotification(ct, comp, nomeSignatario);
          }
        } else {
          await sendEmailNotification(null, comp, nomeSignatario);
        }
      }

      toast.success('Assinatura salva com sucesso!');
      clearCanvas();
      setNomeSignatario('');
      setCpfSignatario('');
      setSelectedComprovante('');
      refetchComprovantes();
    } catch {
      toast.error('Erro ao salvar assinatura');
    } finally {
      setSaving(false);
    }
  };

  const selectedComp = (comprovantes || []).find((c) => c.id === selectedComprovante);
  const selectedContrato = selectedComp?.contratoId ? (contratos || []).find((c) => c.id === selectedComp.contratoId) : null;

  if (isLoading) return <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assinatura Digital</h2>
        <p className="text-sm text-gray-500">{assinaturas.length} assinaturas registradas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Assinatura</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Entrega *</label>
              <select value={selectedComprovante} onChange={(e) => setSelectedComprovante(e.target.value)} className="input-base">
                <option value="">Selecione...</option>
                {comprovantes?.filter(c => !c.assinado).map((c) => (
                  <option key={c.id} value={c.id}>{c.contrato} - {c.locatario}</option>
                ))}
              </select>
            </div>

            {selectedContrato && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Dados do Contrato</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-500">Contrato:</span> <span className="font-medium">{selectedContrato.id}</span></div>
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selectedContrato.cliente}</span></div>
                  <div><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(selectedContrato.equipamentos) ? selectedContrato.equipamentos.join(', ') : '-'}</span></div>
                  <div><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium text-green-600">R$ {Number(selectedContrato.valorMensal || 0).toLocaleString('pt-BR')}/mes</span></div>
                </div>
              </div>
            )}

            {selectedComp && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">Dados do Comprovante</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-500">Locatario:</span> <span className="font-medium">{selectedComp.locatario}</span></div>
                  <div><span className="text-gray-500">Cidade:</span> <span className="font-medium">{selectedComp.cidade}{selectedComp.estado ? `/${selectedComp.estado}` : ''}</span></div>
                  {selectedComp.endereco && <div className="col-span-2"><span className="text-gray-500">Endereco:</span> <span className="font-medium">{selectedComp.endereco}{selectedComp.numero ? `, ${selectedComp.numero}` : ''}</span></div>}
                  {selectedComp.itens && selectedComp.itens.length > 0 && <div><span className="text-gray-500">Itens:</span> <span className="font-medium">{selectedComp.itens.length} item(ns)</span></div>}
                  <div><span className="text-gray-500">Total:</span> <span className="font-medium text-green-600">R$ {Number(selectedComp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Signatario *</label>
              <input type="text" value={nomeSignatario} onChange={(e) => setNomeSignatario(e.target.value)}
                className="input-base" placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" value={cpfSignatario} onChange={(e) => setCpfSignatario(e.target.value)}
                className="input-base" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assinatura</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
                <canvas ref={canvasRef} width={500} height={200}
                  className="w-full cursor-crosshair touch-none min-h-[150px] sm:min-h-[200px]"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Assine usando o mouse ou dedo na tela</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={clearCanvas} icon={Eraser}>Limpar</Button>
              <Button onClick={handleSave} icon={saving ? Loader2 : Save} disabled={saving || sendingEmail}>
                {saving ? 'Salvando...' : sendingEmail ? 'Enviando email...' : 'Salvar Assinatura'}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Assinaturas Registradas</h3>
          {assinaturas.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma assinatura" description="Registre sua primeira assinatura ao lado." />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {assinaturas.map((sig) => {
                const comp = (comprovantes || []).find((c) => c.id === sig.comprovanteId);
                return (
                  <div key={sig.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{sig.nomeSignatario}</span>
                      <StatusBadge status="assinado" />
                    </div>
                    {comp && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="w-3 h-3" />
                        <span>{comp.contrato} - {comp.locatario}</span>
                      </div>
                    )}
                    {sig.cpfSignatario && <p className="text-xs text-gray-500">CPF: {sig.cpfSignatario}</p>}
                    {sig.assinaturaImagem && (
                      <img src={sig.assinaturaImagem} alt="Assinatura" className="border rounded bg-white h-16 object-contain" />
                    )}
                    <p className="text-xs text-gray-400">
                      {sig.dataAssinatura ? formatDateBR(sig.dataAssinatura) : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
