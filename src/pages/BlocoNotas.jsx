import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import { db, isConfigured } from '../lib/supabase';
import { toast } from 'sonner';

export default function BlocoNotas() {
  const [notas, setNotas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNotas = async () => {
      if (!isConfigured()) {
        setNotas([{ id: '1', titulo: 'Bem-vindo', conteudo: 'Este e o bloco de notas do IndustrialFlow CRM.\n\nVoce pode usar este espaco para anotar lembretes, observacoes e qualquer informacao relevante.', created_at: new Date().toISOString() }]);
        return;
      }
      const { data } = await db.notas.list();
      if (data) setNotas(data);
    };
    loadNotas();
  }, []);

  const selectNota = (nota) => {
    setSelectedId(nota.id);
    setTitulo(nota.titulo || '');
    setConteudo(nota.conteudo || '');
  };

  const createNota = async () => {
    const newNota = { titulo: 'Nova Nota', conteudo: '' };
    if (isConfigured()) {
      const { data, error } = await db.notas.create(newNota);
      if (!error && data) {
        setNotas(prev => [data, ...prev]);
        selectNota(data);
      }
    } else {
      const nota = { ...newNota, id: Date.now().toString(), created_at: new Date().toISOString() };
      setNotas(prev => [nota, ...prev]);
      selectNota(nota);
    }
    toast.success('Nota criada!');
  };

  const saveNota = async () => {
    if (!selectedId) return;
    setLoading(true);
    if (isConfigured()) {
      await db.notas.update(selectedId, { titulo, conteudo, updated_at: new Date().toISOString() });
    }
    setNotas(prev => prev.map(n => n.id === selectedId ? { ...n, titulo, conteudo } : n));
    setLoading(false);
    toast.success('Nota salva!');
  };

  const deleteNota = async (id) => {
    if (isConfigured()) {
      await db.notas.delete(id);
    }
    setNotas(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) { setSelectedId(null); setTitulo(''); setConteudo(''); }
    toast.success('Nota removida!');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <Button variant="primary" size="sm" onClick={createNota} className="w-full justify-center">
            <Plus size={14} /> Nova Nota
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notas.map(nota => (
            <div key={nota.id} onClick={() => selectNota(nota)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedId === nota.id ? 'bg-yellow-400/10 border border-yellow-400/30' : 'hover:bg-gray-50 border border-transparent'}`}>
              <p className="text-sm font-medium text-[#1C1C1C] truncate">{nota.titulo || 'Sem titulo'}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{nota.conteudo?.substring(0, 50) || 'Vazio'}</p>
            </div>
          ))}
          {notas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Nenhuma nota ainda</p>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
        {selectedId ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                className="text-lg font-bold text-[#1C1C1C] bg-transparent border-none focus:outline-none flex-1" placeholder="Titulo da nota..." />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => deleteNota(selectedId)}>
                  <Trash2 size={14} />
                </Button>
                <Button variant="primary" size="sm" onClick={saveNota} disabled={loading}>
                  <Save size={14} /> Salvar
                </Button>
              </div>
            </div>
            <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
              className="flex-1 p-4 text-sm text-gray-700 bg-transparent border-none focus:outline-none resize-none"
              placeholder="Escreva sua nota aqui..." />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Selecione uma nota ou crie uma nova</p>
          </div>
        )}
      </div>
    </div>
  );
}
