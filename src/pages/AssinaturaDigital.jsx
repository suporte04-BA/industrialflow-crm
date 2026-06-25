import { useState, useRef, useEffect } from 'react';
import { Eraser, Save, Loader2, FileText, Building2, Download } from 'lucide-react';
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
import { generateEntregaPDF } from '../lib/pdfExport';
import { isValidCPF, isValidCNPJ, formatCPF, formatCNPJ } from '../lib/validation';

export default function AssinaturaDigital() {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedComprovante, setSelectedComprovante] = useState('');
  const [nomeSignatario, setNomeSignatario] = useState('');
  const [cpfSignatario, setCpfSignatario] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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
    isDrawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasPixels = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
    setHasSignature(hasPixels);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleComprovanteChange = (compId) => {
    setSelectedComprovante(compId);
    setNomeSignatario('');
    setCpfSignatario('');
    clearCanvas();
  };

  const sendEmailNotification = async (contrato, comprovante, signatario) => {
    if (!isConfigured()) {
      toast.info('Modo offline - email nao enviado. Configure o Supabase para enviar emails.');
      return;
    }
    setSendingEmail(true);
    try {
      const imagemBase64 = canvasRef.current.toDataURL('image/png');
      const emailData = {
        tipo: 'contrato_assinado',
        contrato_id: contrato?.id || null,
        comprovante_id: comprovante?.id || null,
        destinatario: '',
        contrato: contrato ? {
          id: contrato.id,
          numero: contrato.numero,
          cliente: contrato.cliente,
          cnpj: contrato.cnpj,
          rg: contrato.rg,
          equipamentos: contrato.equipamentos,
          inicio: contrato.inicio,
          fim: contrato.fim,
          valorMensal: contrato.valorMensal,
          valorTotal: contrato.valorTotal,
          atendente: contrato.atendente,
          localEntrega: contrato.localEntrega,
          endereco: contrato.endereco,
          numero_endereco: contrato.numeroEndereco,
          bairro: contrato.bairro,
          cidade: contrato.cidade,
          estado: contrato.estado,
          cep: contrato.cep,
          telefone: contrato.telefone,
          email: contrato.email,
          contato: contrato.contato,
        } : null,
        comprovante: {
          id: comprovante?.id,
          contrato: comprovante?.contrato,
          locatario: comprovante?.locatario,
          cpf: comprovante?.cpf,
          rg: comprovante?.rg,
          endereco: comprovante?.endereco,
          cidade: comprovante?.cidade,
          total: comprovante?.total,
          itens: comprovante?.itens,
          localEntrega: comprovante?.localEntrega,
        },
        signatario: {
          nome: signatario,
          cpf: cpfSignatario,
          data: new Date().toISOString(),
          assinaturaImagem: imagemBase64,
        },
      };

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      const result = await res.json();
      if (result.status === 'enviado') {
        toast.success('Email enviado ao gestor com sucesso!');
      } else if (result.status === 'erro') {
        toast.warning('Assinatura salva, mas houve erro no envio do email.');
      }
    } catch {
      toast.warning('Assinatura salva, mas nao foi possivel enviar o email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const cpfDigits = cpfSignatario.replace(/\D/g, '');
  const cpfFieldType = cpfDigits.length > 11 ? 'cnpj' : 'cpf';
  const isValidDoc = cpfFieldType === 'cnpj' ? isValidCNPJ(cpfSignatario) : isValidCPF(cpfSignatario);
  const docLabel = cpfFieldType === 'cnpj' ? 'CNPJ' : 'CPF';

  const handleCpfChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 11) {
      setCpfSignatario(formatCPF(e.target.value));
    } else {
      setCpfSignatario(formatCNPJ(e.target.value));
    }
  };

  const handleSave = async () => {
    if (!selectedComprovante) { toast.error('Selecione um comprovante de entrega'); return; }
    if (!nomeSignatario.trim()) { toast.error('Preencha o nome de quem recebeu o equipamento'); return; }
    if (!cpfSignatario.trim()) { toast.error('Preencha o CPF/CNPJ de quem recebeu o equipamento'); return; }
    if (!isValidDoc) { toast.error(`${docLabel} invalido. Verifique os digitos.`); return; }
    if (!hasSignature) { toast.error('Faca a assinatura de quem recebeu o equipamento'); return; }
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
          updates: { assinado: true, status: 'assinado', updatedAt: new Date().toISOString() },
        });

        if (comp.contratoId) {
          const ct = (contratos || []).find((c) => c.id === comp.contratoId);
          if (ct) {
            await updateContrato.mutateAsync({ id: ct.id, updates: { assinado: true, status: 'entregue' } });
          }
        }

        try {
          await sendEmailNotification(
            comp.contratoId ? (contratos || []).find((c) => c.id === comp.contratoId) : null,
            comp,
            nomeSignatario
          );
        } catch {
          toast.error('Falha ao enviar email de notificacao ao gestor.');
        }

        try {
          await generateEntregaPDF({ ...comp, assinado: true, nomeSignatario, cpfSignatario, dataAssinatura: new Date().toISOString() });
        } catch {
          // PDF generation failure is non-blocking
        }
      }

      toast.success('Assinatura registrada com sucesso!');
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

  const availableComprovantes = (comprovantes || []).filter(
    (c) => !c.assinado && c.status !== 'assinado' && c.status !== 'cancelado'
  );

  const selectedComp = (comprovantes || []).find((c) => c.id === selectedComprovante);
  const selectedContrato = selectedComp?.contratoId ? (contratos || []).find((c) => c.id === selectedComp.contratoId) : null;

  if (isLoading) return <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assinatura Digital</h2>
        <p className="text-sm text-gray-500">{(assinaturas || []).length} assinaturas registradas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Assinatura do Recebedor</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Entrega *</label>
              <select value={selectedComprovante} onChange={(e) => handleComprovanteChange(e.target.value)} className="input-base" required>
                <option value="">Selecione o comprovante...</option>
                {availableComprovantes.map((c) => (
                  <option key={c.id} value={c.id}>{c.contrato} - {c.locatario}</option>
                ))}
              </select>
              {availableComprovantes.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nenhum comprovante pendente de assinatura</p>
              )}
            </div>

            {selectedContrato && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Dados do Contrato</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-500">Contrato:</span> <span className="font-medium">{selectedContrato.numero || selectedContrato.id}</span></div>
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selectedContrato.cliente}</span></div>
                  <div><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{selectedContrato.cnpj || '-'}</span></div>
                  <div><span className="text-gray-500">RG:</span> <span className="font-medium">{selectedContrato.rg || '-'}</span></div>
                  <div><span className="text-gray-500">Atendente:</span> <span className="font-medium">{selectedContrato.atendente || '-'}</span></div>
                  <div><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(selectedContrato.equipamentos) ? selectedContrato.equipamentos.join(', ') : '-'}</span></div>
                  <div><span className="text-gray-500">Valor Mensal:</span> <span className="font-medium text-green-600">R$ {Number(selectedContrato.valorMensal || 0).toLocaleString('pt-BR')}/mes</span></div>
                  <div><span className="text-gray-500">Local Entrega:</span> <span className="font-medium">{selectedContrato.localEntrega || '-'}</span></div>
                </div>
              </div>
            )}

            {selectedComp && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">Dados da Entrega</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-500">Locatario:</span> <span className="font-medium">{selectedComp.locatario}</span></div>
                  <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{selectedComp.cpf || '-'}</span></div>
                  <div><span className="text-gray-500">RG:</span> <span className="font-medium">{selectedComp.rg || '-'}</span></div>
                  <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedComp.telefone || '-'}</span></div>
                  <div><span className="text-gray-500">Cidade:</span> <span className="font-medium">{selectedComp.cidade}{selectedComp.estado ? `/${selectedComp.estado}` : ''}</span></div>
                  <div><span className="text-gray-500">Contato:</span> <span className="font-medium">{selectedComp.contato || '-'}</span></div>
                  {selectedComp.endereco && <div className="col-span-2"><span className="text-gray-500">Endereco:</span> <span className="font-medium">{selectedComp.endereco}{selectedComp.numero ? `, ${selectedComp.numero}` : ''}{selectedComp.bairro ? ` - ${selectedComp.bairro}` : ''}</span></div>}
                  {selectedComp.localEntrega && <div className="col-span-2"><span className="text-gray-500">Local Entrega:</span> <span className="font-medium">{selectedComp.localEntrega}</span></div>}
                  {selectedComp.itens && selectedComp.itens.length > 0 && <div><span className="text-gray-500">Itens:</span> <span className="font-medium">{selectedComp.itens.length} item(ns)</span></div>}
                  <div><span className="text-gray-500">Total:</span> <span className="font-medium text-green-600">R$ {Number(selectedComp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            )}

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800 font-medium">O signatario e a pessoa que recebeu fisicamente o equipamento. Preencha os dados abaixo com as informacoes do recebedor (pode ser diferente do contato do contrato).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Quem Recebeu *</label>
              <input type="text" required value={nomeSignatario} onChange={(e) => setNomeSignatario(e.target.value)}
                className="input-base" placeholder="Nome completo de quem recebeu o equipamento" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ de Quem Recebeu *</label>
              <input type="text" required value={cpfSignatario}
                onChange={handleCpfChange}
                className="input-base" placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assinatura do Recebedor *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
                <canvas ref={canvasRef} width={500} height={200}
                  className="w-full cursor-crosshair touch-none min-h-[150px] sm:min-h-[200px]"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Quem recebeu o equipamento deve assinar aqui</p>
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
          {(assinaturas || []).length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma assinatura" description="Registre sua primeira assinatura ao lado." />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {assinaturas.map((sig) => {
                const comp = (comprovantes || []).find((c) => c.id === sig.comprovanteId);
                return (
                  <div key={sig.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{sig.nomeSignatario}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="assinado" />
                        {comp && (
                          <button
                            onClick={() => generateEntregaPDF(comp).catch(() => toast.error('Erro ao gerar PDF'))}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Baixar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
