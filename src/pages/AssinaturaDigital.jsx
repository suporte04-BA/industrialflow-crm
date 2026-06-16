import { useState, useRef, useEffect } from 'react';
import { Eraser, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAssinaturas, useCreateAssinatura } from '../hooks/useAssinaturas';
import { useComprovantes } from '../hooks/useComprovantes';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

export default function AssinaturaDigital() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedComprovante, setSelectedComprovante] = useState('');
  const [nomeSignatario, setNomeSignatario] = useState('');
  const [cpfSignatario, setCpfSignatario] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: assinaturas, isLoading, isError, error, refetch } = useAssinaturas();
  const { data: comprovantes } = useComprovantes();
  const createAssinatura = useCreateAssinatura();

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
      toast.success('Assinatura salva com sucesso!');
      clearCanvas();
      setNomeSignatario('');
      setCpfSignatario('');
      setSelectedComprovante('');
    } catch {
      toast.error('Erro ao salvar assinatura');
    } finally {
      setSaving(false);
    }
  };

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
                {comprovantes?.map((c) => (
                  <option key={c.id} value={c.id}>{c.contrato} - {c.locatario}</option>
                ))}
              </select>
            </div>
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
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Assine usando o mouse ou dedo na tela</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={clearCanvas} icon={Eraser}>Limpar</Button>
              <Button onClick={handleSave} icon={saving ? Loader2 : Save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Assinatura'}
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
              {assinaturas.map((sig) => (
                <div key={sig.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{sig.nomeSignatario}</span>
                    <StatusBadge status="assinado" />
                  </div>
                  {sig.cpfSignatario && <p className="text-xs text-gray-500">CPF: {sig.cpfSignatario}</p>}
                  {sig.assinaturaImagem && (
                    <img src={sig.assinaturaImagem} alt="Assinatura" className="border rounded bg-white h-16 object-contain" />
                  )}
                  <p className="text-xs text-gray-400">
                    {sig.dataAssinatura ? new Date(sig.dataAssinatura).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
