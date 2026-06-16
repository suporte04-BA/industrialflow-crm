import { useState } from 'react';
import { Plus, Trash2, Save, FileText, Loader2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { useNotas, useCreateNota, useUpdateNota, useDeleteNota } from '../hooks/useNotas';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

export default function BlocoNotas() {
  const [selectedNota, setSelectedNota] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: notas, isLoading, isError, error, refetch } = useNotas();
  const createNota = useCreateNota();
  const updateNota = useUpdateNota();
  const deleteNota = useDeleteNota();

  const handleCreate = async () => {
    try {
      const nova = await createNota.mutateAsync({ titulo: 'Sem titulo', conteudo: '' });
      setSelectedNota(nova);
      setEditTitle(nova.titulo);
      setEditContent(nova.conteudo);
      toast.success('Nota criada!');
    } catch (err) {
      toast.error('Erro ao criar nota');
    }
  };

  const handleSave = async () => {
    if (!selectedNota) return;
    setSaving(true);
    try {
      await updateNota.mutateAsync({
        id: selectedNota.id,
        updates: { titulo: editTitle || 'Sem titulo', conteudo: editContent },
      });
      setSelectedNota({ ...selectedNota, titulo: editTitle, conteudo: editContent });
      toast.success('Nota salva!');
    } catch (err) {
      toast.error('Erro ao salvar nota');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNota.mutateAsync(id);
      if (selectedNota?.id === id) {
        setSelectedNota(null);
        setEditTitle('');
        setEditContent('');
      }
      toast.success('Nota excluida!');
    } catch (err) {
      toast.error('Erro ao excluir nota');
    }
  };

  const selectNota = (nota) => {
    setSelectedNota(nota);
    setEditTitle(nota.titulo);
    setEditContent(nota.conteudo);
  };

  if (isLoading) return <div className="p-6"><TableSkeleton rows={8} cols={3} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bloco de Notas</h2>
          <p className="text-sm text-gray-500">{notas.length} notas</p>
        </div>
        <Button icon={Plus} onClick={handleCreate}>Nova Nota</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        <div className="bg-white rounded-xl shadow-sm p-4 overflow-y-auto max-h-[600px]">
          {notas.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma nota" description="Crie sua primeira nota." />
          ) : (
            <div className="space-y-2">
              {notas.map((nota) => (
                <div key={nota.id}
                  onClick={() => selectNota(nota)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedNota?.id === nota.id ? 'bg-yellow-50 border-yellow-300' : 'hover:bg-gray-50 border-transparent'
                  }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-gray-900 truncate">{nota.titulo}</h4>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(nota.id); }}
                      className="p-1 text-red-400 hover:text-red-600 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{nota.conteudo || 'Vazio...'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {nota.updatedAt ? new Date(nota.updatedAt).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          {selectedNota ? (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none flex-1"
                  placeholder="Titulo da nota..." />
                <Button onClick={handleSave} icon={saving ? Loader2 : Save} disabled={saving} size="sm">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 w-full min-h-[400px] p-4 text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-yellow-400/40 resize-none"
                placeholder="Escreva suas anotacoes aqui..." />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Selecione uma nota ou crie uma nova</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
