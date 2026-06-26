import { useState, useRef } from 'react';
import { FileUp, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
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
    contato: ai.locatario || ai.contato || '',
    endereco: ai.endereco || '',
    numero: ai.numero || '',
    bairro: ai.bairro || '',
    cidade: ai.cidade || '',
    estado: ai.estado || '',
    cep: ai.cep || '',
    telefone_entrega: ai.telefone_entrega || '',
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
  const fileRef = useRef(null);

  const handleImport = async (e) => {
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

      let fields = null;
      let usedAI = false;

      if (text.length > 50) {
        const tipoHint = /DEVOLU[ÇC][ÃA]O/i.test(text) ? 'devolucao' : 'entrega';
        const aiData = await aiExtract(text, tipoHint);
        if (aiData) {
          fields = mapAiToFields(aiData);
          usedAI = true;
        }
      }

      if (!fields) {
        fields = await importarPDF(file);
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
        setStatus({ type: 'success', message: msg });
      }
    } catch (err) {
      console.error('PDF import error:', err);
      setStatus({ type: 'error', message: `Erro ao processar PDF: ${err.message || 'Verifique se o arquivo e valido.'}` });
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
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleImport}
      />

      {status && (
        <div className={`flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{status.message}</span>
          {status.usedAI && <Sparkles className="w-3 h-3 text-yellow-500" />}
        </div>
      )}
    </div>
  );
}
