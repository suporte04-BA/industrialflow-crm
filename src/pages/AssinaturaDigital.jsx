import { useRef, useState } from 'react';
import Button from '../components/ui/Button';
import { CheckCircle, RotateCcw, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { db, isConfigured } from '../lib/supabase';

const mockComprovantes = [
  { id: '1', locatario: 'Joao da Silva', contrato: 'CT-001', data: '16/06/2026', total: 'R$ 8.500,00', assinado: false, cpf: '123.456.789-00' },
  { id: '2', locatario: 'Empresa Beta S/A', contrato: 'CT-003', data: '16/06/2026', total: 'R$ 3.200,00', assinado: false, cpf: '98.765.432/0001-10' },
];

export default function AssinaturaDigital() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [signed, setSigned] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [nomeSignatario, setNomeSignatario] = useState('');
  const [cpfSignatario, setCpfSignatario] = useState('');
  const [comprovantes, setComprovantes] = useState(mockComprovantes);

  const pendentes = comprovantes.filter(c => !c.assinado);
  const selected = comprovantes.find(c => c.id === selectedId) || null;

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1C1C1C'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setHasSig(true);
  };

  const stopDraw = (e) => { e?.preventDefault(); setIsDrawing(false); };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false); setSigned(false);
  };

  const handleSign = async () => {
    if (!hasSig) { toast.error('Por favor, insira sua assinatura.'); return; }
    if (!selectedId) { toast.error('Selecione um comprovante para assinar.'); return; }

    if (isConfigured()) {
      const canvas = canvasRef.current;
      const assinaturaImagem = canvas.toDataURL('image/png');
      const { error } = await db.assinaturas.create({
        comprovante_id: selectedId,
        nome_signatario: nomeSignatario,
        cpf_signatario: cpfSignatario,
        assinatura_imagem: assinaturaImagem,
      });
      if (!error) {
        await db.comprovantes.update(selectedId, { assinado: true, status: 'assinado' });
      }
    }

    setComprovantes(prev => prev.map(c => c.id === selectedId ? { ...c, assinado: true } : c));
    setSigned(true);
    toast.success('Assinatura realizada com sucesso!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-[#1C1C1C] mb-4">Comprovantes Aguardando Assinatura</h2>
        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <CheckCircle size={32} className="text-green-500" />
            <p className="text-sm text-gray-500 font-medium">Todos os comprovantes foram assinados!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map(c => (
              <label key={c.id} className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${selectedId === c.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="comprovante" value={c.id} checked={selectedId === c.id}
                  onChange={() => { setSelectedId(c.id); setSigned(false); clearCanvas(); setNomeSignatario(c.locatario); setCpfSignatario(c.cpf); }}
                  className="w-4 h-4" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[#1C1C1C]">{c.locatario}</p>
                  <p className="text-xs text-gray-500">Contrato {c.contrato} · {c.data} · {c.total}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1C1C1C]">Area de Assinatura</h2>
            <button onClick={clearCanvas} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium">
              <RotateCcw size={13} /> Limpar
            </button>
          </div>
          {signed ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#1C1C1C] text-lg">Assinatura Realizada!</p>
                <p className="text-sm text-gray-500 mt-1">Comprovante do contrato <span className="font-semibold">{selected?.contrato}</span> assinado por <span className="font-semibold">{nomeSignatario}</span></p>
              </div>
              <Button variant="secondary" onClick={() => { setSigned(false); setSelectedId(null); clearCanvas(); }}>Assinar outro comprovante</Button>
            </div>
          ) : (
            <>
              <div className="relative border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <canvas ref={canvasRef} width={640} height={220} className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                {!hasSig && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-gray-300 text-sm font-medium select-none">Assine aqui</p></div>}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nome do Signatario</label>
                  <input type="text" value={nomeSignatario} onChange={e => setNomeSignatario(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">CPF / CNPJ</label>
                  <input type="text" value={cpfSignatario} onChange={e => setCpfSignatario(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <Button variant="secondary" onClick={clearCanvas} className="flex-1 justify-center"><RotateCcw size={14} /> Limpar</Button>
                <Button variant="primary" onClick={handleSign} className="flex-1 justify-center"><PenLine size={14} /> Assinar Documento</Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-[#1C1C1C] rounded-xl p-5">
        <p className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Validade Juridica</p>
        <p className="text-xs text-gray-400">Este documento e assinado digitalmente conforme a <span className="text-yellow-400">MP 2.200-2/2001</span> e a <span className="text-yellow-400">Lei 14.063/2020</span>.</p>
      </div>
    </div>
  );
}
