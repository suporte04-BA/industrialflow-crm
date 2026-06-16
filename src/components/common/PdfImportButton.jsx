import { useState, useRef } from 'react';
import { FileUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { importarPDF } from '../../lib/pdfImporter';

export default function PdfImportButton({ onFieldsExtracted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);

    try {
      const fields = await importarPDF(file);
      const filledCount = Object.values(fields).filter(Boolean).length;

      if (filledCount === 0) {
        setStatus({ type: 'error', message: 'Nenhum campo detectado no PDF. Verifique o arquivo.' });
      } else {
        onFieldsExtracted(fields);
        setStatus({ type: 'success', message: `${filledCount} campos importados com sucesso!` });
      }
    } catch (err) {
      console.error('PDF import error:', err);
      setStatus({ type: 'error', message: 'Erro ao processar PDF. Verifique se o arquivo e valido.' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <FileUp className="w-5 h-5" />
        )}
        <span className="font-medium">{loading ? 'Processando PDF...' : 'Importar PDF do Pedido'}</span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleImport}
      />

      {status && (
        <div className={`flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
