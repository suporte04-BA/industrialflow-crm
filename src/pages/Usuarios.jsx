import { useState } from 'react';
import { Users, Plus, Trash2, Shield, UserCheck, Loader2, Search, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUsuarios, useCreateUsuario, useUpdateUsuarioRole, useDeleteUsuario } from '../hooks/useUsuarios';
import { useAuth } from '../lib/AuthContext';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

const roleLabels = { admin: 'Admin', gestor: 'Gestor', funcionario: 'Funcionario' };
const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  gestor: 'bg-yellow-100 text-yellow-700',
  funcionario: 'bg-gray-100 text-gray-700',
};

export default function Usuarios() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ fullName: '', password: '', role: 'funcionario' });
  const [creating, setCreating] = useState(false);

  const handleSearch = () => setSearchTerm(searchInput);
  const clearSearch = () => { setSearchInput(''); setSearchTerm(''); };

  const { data: usuarios, isLoading, isError, error, refetch } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const updateRole = useUpdateUsuarioRole();
  const deleteUsuario = useDeleteUsuario();

  const gestorCount = usuarios.filter((u) => u.role === 'gestor' || u.role === 'admin').length;

  const filtered = usuarios.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.fullName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Preencha o nome'); return; }
    if (!form.password.trim() || form.password.length < 6) { toast.error('Senha minima: 6 caracteres'); return; }
    setCreating(true);
    try {
      await createUsuario.mutateAsync({
        fullName: form.fullName.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success(`Usuario ${form.fullName} criado com sucesso!`);
      setForm({ fullName: '', password: '', role: 'funcionario' });
      setShowCreate(false);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao criar usuario');
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (userId === user?.id) {
      toast.error('Voce nao pode mudar sua propria funcao');
      return;
    }
    const target = usuarios.find((u) => u.id === userId);
    if (target && (target.role === 'gestor' || target.role === 'admin') && newRole === 'funcionario' && gestorCount <= 1) {
      toast.error('Deve haver pelo menos um gestor no sistema.');
      return;
    }
    try {
      await updateRole.mutateAsync({ id: userId, role: newRole, currentUserId: user?.id });
      toast.success(`Funcao alterada para ${roleLabels[newRole]}`);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao alterar funcao');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user?.id) {
      toast.error('Voce nao pode remover seu proprio usuario');
      return;
    }
    const target = usuarios.find((u) => u.id === userId);
    if (target && (target.role === 'gestor' || target.role === 'admin') && gestorCount <= 1) {
      toast.error('Deve haver pelo menos um gestor no sistema.');
      return;
    }
    if (!window.confirm(`Remover o usuario ${target?.fullName || 'este usuario'}?`)) return;
    try {
      await deleteUsuario.mutateAsync({ id: userId, currentUserId: user?.id });
      toast.success('Usuario removido');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover usuario');
    }
  };

  if (isLoading) return <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestao de Usuarios</h2>
          <p className="text-sm text-gray-500">{usuarios.length} usuarios cadastrados | {gestorCount} gestor(es)</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Fechar' : 'Novo Usuario'}
        </Button>
      </div>

      {gestorCount <= 1 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <p className="text-sm text-yellow-700">Apenas {gestorCount} gestor(es) no sistema. Nao e possivel demover o ultimo gestor.</p>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Usuario</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input type="text" required value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input-base" placeholder="Nome do usuario" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha * (min. 6 caracteres)</label>
                <input type="password" required value={form.password} minLength={6}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-base" placeholder="Senha" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Funcao *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input-base">
                  <option value="funcionario">Funcionario</option>
                  <option value="gestor">Gestor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" icon={creating ? Loader2 : Plus} disabled={creating}>
                {creating ? 'Criando...' : 'Criar Usuario'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Pressione Enter para buscar..." value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          className="input-base pl-10 pr-9" />
        {searchInput && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button onClick={handleSearch} className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-medium text-sm hover:bg-yellow-300 transition-colors flex items-center gap-1.5">
        <Search className="w-4 h-4" /> Buscar
      </button>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuario" description="Crie o primeiro usuario clicando no botao acima." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email (interno)</th>
                  <th className="px-4 py-3 font-medium">Funcao</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isCurrentUser = u.id === user?.id;
                  const isGestorAdmin = u.role === 'gestor' || u.role === 'admin';
                  const canDemote = isGestorAdmin && gestorCount <= 1;
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-gray-900">
                              {(u.fullName || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.fullName}</p>
                            {isCurrentUser && <p className="text-xs text-yellow-600">(Voce)</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                          {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {roleLabels[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.role === 'funcionario' && (
                            <button
                              onClick={() => handleChangeRole(u.id, 'gestor')}
                              disabled={isCurrentUser}
                              className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                            >
                              Tornar Gestor
                            </button>
                          )}
                          {u.role === 'gestor' && (
                            <button
                              onClick={() => handleChangeRole(u.id, 'funcionario')}
                              disabled={isCurrentUser || canDemote}
                              className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                              title={canDemote ? 'Deve haver pelo menos um gestor' : ''}
                            >
                              Tornar Funcionario
                            </button>
                          )}
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remover usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
