import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Camera, RotateCcw, Check, Loader2, X, Video, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024;
  return isMobile || isTouch;
}

// Burns a professional timestamp + watermark onto the photo (like a security camera)
function burnTimestamp(ctx, width, height, timestamp) {
  if (!timestamp) return;
  const barH = Math.max(18, Math.round(height * 0.075));
  const fontSize = Math.max(9, Math.round(barH * 0.5));
  // Semi-transparent black bar at bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, height - barH, width, barH);
  // Yellow accent line on top of bar
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(0, height - barH, width, 2);
  // Timestamp text (left)
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(timestamp, 6, height - barH / 2 + 1);
  // Watermark (right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#EAB308';
  ctx.fillText('TRANSOBRA', width - 6, height - barH / 2 + 1);
}

function drawScaled(img, maxSize) {
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
  return { canvas, ctx, width, height };
}

function compressImage(file, maxSize = 600, quality = 0.5, timestamp = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx, width, height } = drawScaled(img, maxSize);
        burnTimestamp(ctx, width, height, timestamp);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl, maxSize = 600, quality = 0.5, timestamp = null) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { canvas, ctx, width, height } = drawScaled(img, maxSize);
      burnTimestamp(ctx, width, height, timestamp);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
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

function CameraOverlay({ onCapture, onClose, slotLabel, isMobile: isMob }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const facingMode = isMob ? 'environment' : 'user';
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: Math.min(1920, dimensions.w * 2) },
            height: { ideal: Math.min(1080, dimensions.h * 2) },
          },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (mounted) setCameraReady(true);
        }
      } catch (err) {
        if (!mounted) return;
        if (err.name === 'NotAllowedError') {
          setCameraError('Permissao negada. Habilite a camera no navegador.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('Nenhuma camera encontrada.');
        } else {
          setCameraError('Erro ao abrir camera: ' + (err.message || 'Erro'));
        }
      }
    };
    startCamera();
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isMob, dimensions.w, dimensions.h]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    const ts = getTimestamp();
    compressDataUrl(dataUrl, 600, 0.5, ts).then((compressed) => {
      onCapture(compressed, ts);
    });
  }, [onCapture, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const isSmallScreen = dimensions.w < 640;
  const isMediumScreen = dimensions.w >= 640 && dimensions.w < 1024;
  const viewfinderHeight = isSmallScreen ? dimensions.h * 0.55 : isMediumScreen ? dimensions.h * 0.6 : dimensions.h * 0.65;
  const viewfinderWidth = Math.min(dimensions.w * (isSmallScreen ? 0.92 : isMediumScreen ? 0.7 : 0.5), 500);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ height: '100dvh' }}
    >
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-black/80 shrink-0">
        <button onClick={handleClose} className="p-2 text-white/80 hover:text-white">
          <ArrowLeft size={isSmallScreen ? 20 : 22} />
        </button>
        <span className="text-white/90 text-xs sm:text-sm font-medium">{slotLabel || 'Camera'}</span>
        <div className="w-10" />
      </div>

      <div ref={containerRef} className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 overflow-hidden">
        {cameraError ? (
          <div className="text-center px-6 max-w-sm">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Camera size={isSmallScreen ? 24 : 28} className="text-white/40" />
            </div>
            <p className="text-white/70 text-xs sm:text-sm mb-4">{cameraError}</p>
            <button onClick={handleClose}
              className="px-6 py-2.5 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl"
            style={{ width: viewfinderWidth, height: viewfinderHeight, maxWidth: '100%', maxHeight: '100%' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: isMob ? 'none' : 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            <AnimatePresence>
              {flash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-white z-10"
                />
              )}
            </AnimatePresence>

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <Loader2 size={isSmallScreen ? 28 : 32} className="text-white animate-spin mx-auto mb-2" />
                  <p className="text-white/70 text-[10px] sm:text-xs">Abrindo camera...</p>
                </div>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-white/40 rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pb-6 sm:pb-8 pt-3 sm:pt-4 bg-black shrink-0">
        {!cameraError && (
          <button
            onClick={capturePhoto}
            disabled={!cameraReady}
            className="rounded-full bg-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-white/20"
            style={{ width: isSmallScreen ? 60 : 72, height: isSmallScreen ? 60 : 72 }}
          >
            <div className="rounded-full border-[3px] border-black/10 flex items-center justify-center"
              style={{ width: isSmallScreen ? 48 : 60, height: isSmallScreen ? 48 : 60 }}>
              <Camera size={isSmallScreen ? 22 : 26} className="text-black/70" />
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PreviewOverlay({ preview, timestamp, onConfirm, onRetake }) {
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isSmall = dims.w < 640;
  const previewH = isSmall ? dims.h * 0.5 : dims.h * 0.6;
  const previewW = Math.min(dims.w * (isSmall ? 0.92 : 0.6), 500);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ height: '100dvh' }}
    >
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 overflow-hidden">
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-green-400/50 shadow-2xl"
          style={{ width: previewW, height: previewH, maxWidth: '100%', maxHeight: '100%' }}>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-[10px] sm:text-[11px] font-mono text-center">{timestamp}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 sm:gap-4 justify-center pb-6 sm:pb-8 pt-3 sm:pt-4 px-4 sm:px-6 bg-black shrink-0">
        <button onClick={onRetake}
          className="flex-1 max-w-[160px] flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white/10 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-white/20 transition-colors border border-white/20">
          <RotateCcw size={isSmall ? 14 : 16} /> Repetir
        </button>
        <button onClick={onConfirm}
          className="flex-1 max-w-[160px] flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-green-500 text-white rounded-full text-xs sm:text-sm font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30">
          <Check size={isSmall ? 14 : 16} /> Confirmar
        </button>
      </div>
    </motion.div>
  );
}

export default function CameraCapture({ onCapture, label, slotLabel, disabled = false }) {
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const isMobile = useMemo(() => isMobileDevice(), []);

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
      const ts = getTimestamp();
      const compressed = await compressImage(file, 600, 0.5, ts);
      setPreview(compressed);
      setTimestamp(ts);
    } catch {
      setError('Erro ao processar imagem');
    } finally {
      setCapturing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, []);

  const handleWebCamCapture = useCallback((dataUrl, ts) => {
    setShowCamera(false);
    setPreview(dataUrl);
    setTimestamp(ts);
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
    setShowCamera(true);
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  return (
    <>
      <div>
        {isMobile ? (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={disabled || capturing}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 border-2 border-dashed border-gray-300 rounded-xl text-xs sm:text-sm text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 transition-colors disabled:opacity-50 active:bg-yellow-100"
            >
              {capturing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              {capturing ? 'Processando...' : slotLabel || label || 'Tirar Foto'}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-0.5">Abra a camera do dispositivo</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </>
        ) : (
          <>
            <button
              onClick={() => setShowCamera(true)}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 border-2 border-dashed border-blue-300 rounded-xl text-xs sm:text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Video size={14} />
              {slotLabel || label || 'Usar Webcam'}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-0.5">Abra a camera do notebook/PC</p>
          </>
        )}
        {error && <p className="text-[10px] sm:text-xs text-red-500 mt-1 flex items-center gap-1"><X size={10} />{error}</p>}
      </div>

      <AnimatePresence>
        {showCamera && (
          <CameraOverlay
            onCapture={handleWebCamCapture}
            onClose={handleCloseCamera}
            slotLabel={slotLabel}
            isMobile={false}
          />
        )}
        {preview && (
          <PreviewOverlay
            preview={preview}
            timestamp={timestamp}
            onConfirm={handleConfirm}
            onRetake={handleRetake}
          />
        )}
      </AnimatePresence>
    </>
  );
}
