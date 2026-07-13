import { useState, useRef, useCallback } from 'react';
import { Camera, RotateCcw, Check, Loader2, X } from 'lucide-react';

function compressImage(file, maxSize = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        } else {
          if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function getTimestamp() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
}

export default function CameraCapture({ onCapture, label, slotLabel, disabled = false }) {
  const [preview, setPreview] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande (max 10MB)');
      return;
    }
    setCapturing(true);
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
      setTimestamp(getTimestamp());
    } catch {
      setError('Erro ao processar imagem');
    } finally {
      setCapturing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, []);

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview, timestamp);
      setPreview(null);
      setTimestamp(null);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setTimestamp(null);
    setError(null);
  };

  if (preview) {
    return (
      <div className="relative border-2 border-green-300 rounded-xl overflow-hidden bg-green-50">
        <img src={preview} alt="Preview" className="w-full h-28 object-cover" />
        <div className="px-2 py-1 text-[10px] text-green-700 bg-green-100 text-center font-mono">
          {timestamp}
        </div>
        <div className="flex gap-1 p-1">
          <button onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
            <Check size={12} /> Confirmar
          </button>
          <button onClick={handleRetake}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300">
            <RotateCcw size={12} /> Repetir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || capturing}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-50 active:bg-yellow-100"
      >
        {capturing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Camera size={16} />
        )}
        {capturing ? 'Processando...' : slotLabel || label || 'Abrir Camera'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><X size={10} />{error}</p>}
    </div>
  );
}
