import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Loader2, CheckCircle, AlertCircle, Sparkles, X, Eye, Zap, AlertTriangle } from 'lucide-react';
import { parseComprovantePDF } from '../../lib/pdfExtractor/index.js';

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

function countFilledFields(fields) {
  const textFields = { ...fields };
  delete textFields.itens;
  delete textFields.valores;
  delete textFields.condicoes;
  return Object.values(textFields).filter(v => typeof v === 'string' && v.length > 0).length;
}

export default function PdfImportButton({ onFieldsExtracted }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [regexResult, setRegexResult] = useState(null);
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
      // Step 1: Parse PDF with regex engine
      const result = await parseComprovantePDF(file);

      if (!result.rawText || result.rawText.trim().length < 20) {
        setStatus({ type: 'error', message: 'Nao foi possivel extrair texto do PDF. Verifique o arquivo.' });
        setLoading(false);
        return;
      }

      // Step 2: Show preview with regex result
      setPreviewText(result.rawText);
      setRegexResult(result);
      setShowPreview(true);
    } catch (err) {
      console.error('PDF parse error:', err);
      setStatus({ type: 'error', message: 'Erro ao processar PDF. Verifique se o arquivo e valido.' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const processWithAI = async () => {
    setProcessing(true);
    try {
      const tipoHint = regexResult?.parsed?.tipo_documento || 'entrega';
      const aiData = await aiExtract(previewText, tipoHint);

      if (aiData && typeof aiData === 'object') {
        const fields = mapAiToFields(aiData);
        finishImport(fields, true);
      } else {
        // AI failed, use regex result
        finishImport(regexResult.parsed, false);
      }
    } catch {
      finishImport(regexResult.parsed, false);
    } finally {
      setProcessing(false);
    }
  };

  const processWithRegex = () => {
    finishImport(regexResult.parsed, false);
  };

  const finishImport = (fields, usedAI) => {
    setShowPreview(false);
    setPreviewText('');
    setRegexResult(null);

    if (!fields) {
      setStatus({ type: 'error', message: 'Nao foi possivel processar o PDF. Verifique o arquivo.' });
      return;
    }

    const filledCount = countFilledFields(fields);
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
    setRegexResult(null);
  };

  const regexFields = regexResult?.parsed || {};
  const regexItemCount = regexResult?.parsed?.itens?.length || 0;
  const regexFilled = regexResult ? countFilledFields(regexResult.parsed) : 0;

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
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Dados Detectados no PDF</h3>
                </div>
                <button onClick={cancelPreview} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Regex result summary */}
                {regexFields.tipo_documento && (
                  <div className={`rounded-lg p-3 border ${
                    regexFields.tipo_documento === 'devolucao'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        regexFields.tipo_documento === 'devolucao'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {regexFields.tipo_documento === 'devolucao' ? 'DEVOLUCAO' : 'ENTREGA'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {regexFilled} campos | {regexItemCount} itens
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {regexFields.contrato && <div><span className="text-gray-500">Contrato:</span> <span className="font-medium">{regexFields.contrato}</span></div>}
                      {regexFields.locatario && <div><span className="text-gray-500">Locatario:</span> <span className="font-medium">{regexFields.locatario}</span></div>}
                      {regexFields.cpf_cnpj && <div><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{regexFields.cpf_cnpj}</span></div>}
                      {regexFields.cidade && <div><span className="text-gray-500">Cidade:</span> <span className="font-medium">{regexFields.cidade}/{regexFields.estado}</span></div>}
                      {regexFields.data_retirada && <div><span className="text-gray-500">Data:</span> <span className="font-medium">{regexFields.data_retirada}</span></div>}
                      {regexFields.hora && <div><span className="text-gray-500">Hora:</span> <span className="font-medium">{regexFields.hora}</span></div>}
                    </div>
                  </div>
                )}

                {/* Raw text preview */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Texto extraido do PDF:</p>
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-[30vh] overflow-y-auto border">
                    {previewText}
                  </pre>
                </div>

                {/* Validation warnings */}
                {regexResult?.validation?.warnings?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-800">Atencao:</span>
                    </div>
                    {regexResult.validation.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-yellow-700 ml-6">{w}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
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
                  Melhorar com IA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
