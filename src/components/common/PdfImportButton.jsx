import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Loader2, CheckCircle, AlertCircle, Sparkles, X, Eye, Zap } from 'lucide-react';
import { extractTextFromPDF } from '../../lib/pdfParser';
import { importarPDF } from '../../lib/pdfImporter';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function aiExtract(text, tipoDocumento) {
  try {
    const res = await fetch('/api/ai/extract-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tipo_documento: tipoDocumento }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
    return null;
  } catch {
    return null;
  }
}

function mapAiToFields(ai) {
  const itens = Array.isArray(ai.itens)
    ? ai.itens.map(it => ({
        quantidade: it.quantidade || 1,
        descricao: it.descricao || '',
        patrimonio: it.patrimonio || 'PAT-000',
        data_locacao: it.data_locacao || it.dataLocacao || '',
        data_devolucao: it.data_devolucao || it.dataDevolucao || '',
        valor_unitario: it.valor_unitario || it.valorUnitario || 0,
        qtd_devolvida: it.qtd_devolvida || it.qtdDevolvida || 0,
      }))
    : [];

  const equipamentos = itens
    .map(it => it.descricao)
    .filter(d => d && d.length > 2);

  return {
    numero_pedido: ai.numero_pedido || ai.contrato || '',
    contrato: ai.contrato || '',
    atendente: ai.atendente || '',
    locatario: ai.locatario || '',
    cpf_cnpj: ai.cpf_cnpj || '',
    rg: ai.rg || '',
    telefone: ai.telefone || '',
    contato: ai.contato || '',
    contato_cliente: ai.contato || '',
    endereco: ai.endereco || '',
    numero: ai.numero || '',
    bairro: ai.bairro || '',
    cidade: ai.cidade || '',
    estado: ai.estado || '',
    cep: ai.cep || '',
    telefone_entrega: ai.telefone_entrega || ai.telefone_obra || '',
    local_entrega: ai.local_entrega || ai.local_obra || '',
    referencia: ai.referencia || '',
    data_retirada: ai.data_retirada || ai.data_devolucao || '',
    hora: ai.hora || '',
    observacao: ai.observacao || '',
    itens,
    equipamentos,
    valor_total: ai.valor_total || 0,
    valor_mensal: ai.valor_mensal || ai.valor_total || 0,
    tipo_documento: ai.tipo_documento || 'entrega',
    condicoes: ai.condicoes || {},
  };
}

export default function PdfImportButton({ onFieldsExtracted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatus({ type: 'error', message: 'Apenas arquivos PDF sao aceitos.' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus({ type: 'error', message: `Arquivo muito grande. Maximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.` });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const extracted = await extractTextFromPDF(file);
      const text = extracted.text || '';

      if (!text || text.trim().length < 20) {
        setStatus({ type: 'error', message: 'Nao foi possivel extrair texto do PDF. Verifique o arquivo.' });
        setLoading(false);
        return;
      }

      setPreviewText(text);
      setPreviewFile(file);
      setShowPreview(true);
    } catch (err) {
      console.error('PDF extract error:', err);
      setStatus({ type: 'error', message: 'Erro ao extrair texto do PDF.' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const processWithAI = async () => {
    setProcessing(true);
    try {
      const tipoHint = /DEVOLU[ÇC][ÃA]O/i.test(previewText) ? 'devolucao' : 'entrega';
      const aiData = await aiExtract(previewText, tipoHint);
      if (aiData && typeof aiData === 'object') {
        const fields = mapAiToFields(aiData);
        finishImport(fields, true);
      } else {
        const fields = await importarPDF(previewFile);
        finishImport(fields, false);
      }
    } catch {
      const fields = await importarPDF(previewFile);
      finishImport(fields, false);
    } finally {
      setProcessing(false);
    }
  };

  const processWithRegex = async () => {
    setProcessing(true);
    try {
      const fields = await importarPDF(previewFile);
      finishImport(fields, false);
    } catch {
      setStatus({ type: 'error', message: 'Erro ao processar com regex.' });
    } finally {
      setProcessing(false);
    }
  };

  const finishImport = (fields, usedAI) => {
    setShowPreview(false);
    setPreviewText('');
    setPreviewFile(null);

    if (!fields) {
      setStatus({ type: 'error', message: 'Nao foi possivel processar o PDF. Verifique o arquivo.' });
      return;
    }

    const textFields = { ...fields };
    delete textFields.itens;
    delete textFields.valores;
    delete textFields.condicoes;
    const filledCount = Object.values(textFields).filter(v => typeof v === 'string' && v.length > 0).length;
    const itemCount = Array.isArray(fields.itens) ? fields.itens.length : 0;

    if (filledCount === 0) {
      setStatus({ type: 'error', message: 'Nenhum campo detectado no PDF. Verifique o arquivo.' });
    } else {
      onFieldsExtracted(fields);
      const tipoLabel = fields.tipo_documento === 'devolucao' ? 'Devolucao' : 'Entrega';
      const aiLabel = usedAI ? ' [IA]' : '';
      const msg = itemCount > 0
        ? `${filledCount} campos e ${itemCount} item(ns) importados (${tipoLabel})${aiLabel}!`
        : `${filledCount} campos importados (${tipoLabel})${aiLabel}!`;
      setStatus({ type: 'success', message: msg, usedAI });
    }
  };

  const cancelPreview = () => {
    setShowPreview(false);
    setPreviewText('');
    setPreviewFile(null);
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
        <span className="font-medium">{loading ? 'Extraindo texto...' : 'Importar PDF do Pedido'}</span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {status && (
        <div className={`flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{status.message}</span>
          {status.usedAI && <Sparkles className="w-3 h-3 text-yellow-500" />}
        </div>
      )}

      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={cancelPreview}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Texto Extraido do PDF</h3>
                </div>
                <button onClick={cancelPreview} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-[50vh] overflow-y-auto border">
                  {previewText}
                </pre>
              </div>

              <div className="flex gap-3 justify-end p-4 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={cancelPreview}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={processWithRegex} disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Usar Regex
                </button>
                <button onClick={processWithAI} disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Enviar para IA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
