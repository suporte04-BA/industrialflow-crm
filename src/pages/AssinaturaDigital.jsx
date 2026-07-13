import { useState, useRef, useEffect } from 'react';
import { Eraser, Save, Loader2, FileText, Building2, Download, User, Camera, Image } from 'lucide-react';
import { toast } from 'sonner';
import { useAssinaturas, useCreateAssinatura } from '../hooks/useAssinaturas';
import { useComprovantes, useUpdateComprovante } from '../hooks/useComprovantes';
import { useContratos, useUpdateContrato } from '../hooks/useContratos';
import { useAuth } from '../lib/AuthContext';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import CameraCapture from '../components/ui/CameraCapture';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';
import { generateEntregaPDF, generateFallbackEmailPDF } from '../lib/pdfExport';
import { getEmailHeaders } from '../lib/supabase';
import { formatDateBR } from '../lib/dates';
import { formatCPF, formatCNPJ, isValidCPF, isValidCNPJ, detectDocumentType } from '../lib/validation';

function compressCanvas(src, w = 400, h = 160, quality = 0.7) {
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const ctx = tmp.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h);
  return tmp.toDataURL('image/jpeg', quality);
}

export default function AssinaturaDigital() {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedComprovante, setSelectedComprovante] = useState('');
  const [nomeSignatario, setNomeSignatario] = useState('');
  const [cpfSignatario, setCpfSignatario] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [fotosEntrega, setFotosEntrega] = useState([]);
  const [fotosRetirada, setFotosRetirada] = useState([]);

  const { isFuncionario, profile } = useAuth();
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
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

  const sendEmailNotification = async (contrato, comprovante, signatario, imagemBase64, funcionarioNome) => {
    setSendingEmail(true);
    try {
      let img = imagemBase64;
      if (!img) {
        img = compressCanvas(canvasRef.current);
      }
      const emailData = {
        tipo: 'contrato_assinado',
        contrato_id: contrato?.id || null,
        comprovante_id: comprovante?.id || null,
        destinatario: '',
        tipoDocumento: comprovante?.tipoDocumento || 'entrega',
        funcionario: { nome: funcionarioNome || '' },
        contrato: contrato ? {
          id: contrato.id,
          numero: contrato.numero,
          cliente: contrato.cliente,
          cnpj: contrato.cnpj,
          rg: contrato.rg || '',
          telefone: contrato.telefone || '',
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
          contato: contrato.contato,
        } : null,
        comprovante: {
          id: comprovante?.id,
          contrato: comprovante?.contrato,
          locatario: comprovante?.locatario,
          cpf: comprovante?.cpf,
          rg: comprovante?.rg || '',
          telefone: comprovante?.telefone || '',
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
          assinaturaImagem: img,
        },
      };

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: await getEmailHeaders(),
        body: JSON.stringify(emailData),
      });
      const result = await res.json();
      if (result.status === 'enviado') {
        toast.success('Email enviado ao gestor com sucesso!');
      } else {
        try {
          await generateFallbackEmailPDF(emailData);
          toast.warning('Email nao enviado. PDF gerado como alternativa.');
        } catch {
          toast.warning('Assinatura salva, mas email e PDF fallback falharam.');
        }
      }
    } catch {
      try {
        const imagemBase64 = compressCanvas(canvasRef.current);
        await generateFallbackEmailPDF({
          tipo: 'contrato_assinado',
          contrato: contrato ? {
            id: contrato.id, numero: contrato.numero, cliente: contrato.cliente,
            cnpj: contrato.cnpj, cidade: contrato.cidade, localEntrega: contrato.localEntrega,
            equipamentos: contrato.equipamentos, valorTotal: contrato.valorTotal,
            atendente: contrato.atendente,
          } : null,
          comprovante: {
            locatario: comprovante?.locatario, cpf: comprovante?.cpf,
            itens: comprovante?.itens, cidade: comprovante?.cidade, total: comprovante?.total,
          },
          signatario: { nome: signatario, cpf: cpfSignatario, assinaturaImagem: imagemBase64 },
        });
        toast.warning('Email indisponivel. PDF gerado como alternativa.');
      } catch {
        toast.warning('Assinatura salva, mas nao foi possivel enviar email nem gerar PDF.');
      }
    } finally {
      setSendingEmail(false);
    }
  };

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
    const docType = detectDocumentType(cpfSignatario);
    const isValidDoc = docType === 'cnpj' ? isValidCNPJ(cpfSignatario) : isValidCPF(cpfSignatario);
    if (!isValidDoc) { toast.error(`${docType === 'cnpj' ? 'CNPJ' : 'CPF'} invalido. Verifique os digitos.`); return; }
    if (!hasSignature) { toast.error('Faca a assinatura de quem recebeu o equipamento'); return; }
    setSaving(true);
    try {
      const imagem = compressCanvas(canvasRef.current);
      await createAssinatura.mutateAsync({
        comprovanteId: selectedComprovante,
        nomeSignatario,
        cpfSignatario,
        assinaturaImagem: imagem,
        funcionarioId: isFuncionario ? profile?.id : null,
        fotosEntrega: fotosEntrega.length > 0 ? fotosEntrega : [],
        fotosRetirada: fotosRetirada.length > 0 ? fotosRetirada : [],
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

        toast.success('Assinatura registrada com sucesso!');
        clearCanvas();
        setNomeSignatario('');
        setCpfSignatario('');
        setSelectedComprovante('');
        refetchComprovantes();

        const contrato = comp.contratoId ? (contratos || []).find((c) => c.id === comp.contratoId) : null;
        const funcionarioNome = profile?.fullName || profile?.full_name || '';
        sendEmailNotification(contrato, comp, nomeSignatario, imagem, funcionarioNome).catch(() => {});
        generateEntregaPDF({ ...comp, assinado: true, nomeSignatario, cpfSignatario, dataAssinatura: new Date().toISOString(), signatureImg: imagem }).catch(() => {});
      } else {
        toast.success('Assinatura registrada com sucesso!');
        clearCanvas();
        setNomeSignatario('');
        setCpfSignatario('');
        setSelectedComprovante('');
        refetchComprovantes();
      }
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

  if (isLoading) return <div className="p-4 md:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 md:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assinatura Digital</h2>
          <p className="text-sm text-gray-500">{(assinaturas || []).length} assinaturas registradas</p>
        </div>
        {isFuncionario && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <User className="w-3 h-3" /> Visao Funcionario
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Assinatura do Recebedor</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante de Entrega *</label>
              <select value={selectedComprovante} onChange={(e) => handleComprovanteChange(e.target.value)} className="input-base" required>
                <option value="">Selecione o comprovante...</option>
                {availableComprovantes.map((c) => {
                  const tipoLabel = c.tipoDocumento === 'devolucao' ? 'Devolução' : 'Entrega';
                  return (
                    <option key={c.id} value={c.id}>{tipoLabel} — {c.contrato} — {c.locatario}</option>
                  );
                })}
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
                  {selectedContrato.rg && <div><span className="text-gray-500">RG:</span> <span className="font-medium">{selectedContrato.rg}</span></div>}
                  <div><span className="text-gray-500">Atendente:</span> <span className="font-medium">{selectedContrato.atendente || '-'}</span></div>
                  {selectedContrato.telefone && <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedContrato.telefone}</span></div>}
                  <div><span className="text-gray-500">Equipamentos:</span> <span className="font-medium">{Array.isArray(selectedContrato.equipamentos) ? selectedContrato.equipamentos.join(', ') : '-'}</span></div>
                  <div><span className="text-gray-500">Local Entrega:</span> <span className="font-medium">{selectedContrato.localEntrega || '-'}</span></div>
                </div>
              </div>
            )}

            {selectedComp && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedComp.tipoDocumento === 'devolucao' ? 'Devolução' : 'Entrega'} — Dados do Comprovante
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-500">Locatario:</span> <span className="font-medium">{selectedComp.locatario}</span></div>
                  <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{selectedComp.cpf || '-'}</span></div>
                  {selectedComp.rg && <div><span className="text-gray-500">RG:</span> <span className="font-medium">{selectedComp.rg}</span></div>}
                  <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedComp.telefoneEntrega || selectedComp.telefone || '-'}</span></div>
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

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Fotos Obrigatórias da Entrega (3)</span>
              </div>
              <p className="text-xs text-blue-600 mb-3">Tire fotos do equipamento no momento da entrega</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={`entrega-${i}`}>
                    <CameraCapture
                      label={fotosEntrega[i] ? `Foto ${i + 1}` : `Foto ${i + 1}`}
                      icon={Camera}
                      onCapture={(img) => {
                        const newFotos = [...fotosEntrega];
                        newFotos[i] = img;
                        setFotosEntrega(newFotos);
                      }}
                      disabled={saving}
                    />
                    {fotosEntrega[i] && (
                      <div className="mt-1 flex items-center gap-1">
                        <img src={fotosEntrega[i]} alt={`Entrega ${i + 1}`} className="w-full h-16 object-cover rounded border" />
                        <button onClick={() => {
                          const newFotos = [...fotosEntrega];
                          newFotos.splice(i, 1);
                          setFotosEntrega(newFotos);
                        }} className="text-red-400 hover:text-red-600 p-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {fotosEntrega.length >= 3 && <p className="text-xs text-green-600 mt-2 font-medium">3 fotos capturadas</p>}
            </div>

            <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-800">Fotos da Retirada (3)</span>
              </div>
              <p className="text-xs text-orange-600 mb-3">Tire fotos do equipamento no momento da retirada (opcional)</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={`retirada-${i}`}>
                    <CameraCapture
                      label={fotosRetirada[i] ? `Foto ${i + 1}` : `Foto ${i + 1}`}
                      icon={Image}
                      onCapture={(img) => {
                        const newFotos = [...fotosRetirada];
                        newFotos[i] = img;
                        setFotosRetirada(newFotos);
                      }}
                      disabled={saving}
                    />
                    {fotosRetirada[i] && (
                      <div className="mt-1 flex items-center gap-1">
                        <img src={fotosRetirada[i]} alt={`Retirada ${i + 1}`} className="w-full h-16 object-cover rounded border" />
                        <button onClick={() => {
                          const newFotos = [...fotosRetirada];
                          newFotos.splice(i, 1);
                          setFotosRetirada(newFotos);
                        }} className="text-red-400 hover:text-red-600 p-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" onClick={clearCanvas} icon={Eraser}>Limpar</Button>
              <Button onClick={handleSave} icon={saving ? Loader2 : Save} disabled={saving || sendingEmail}>
                {saving ? 'Salvando...' : sendingEmail ? 'Enviando email...' : 'Salvar Assinatura'}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
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
                            onClick={() => generateEntregaPDF({ ...comp, signatureImg: sig.assinaturaImagem, signatarioNome: sig.nomeSignatario }).catch(() => toast.error('Erro ao gerar PDF'))}
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
