import { useState } from 'react';
import { Users, Plus, Trash2, Shield, UserCheck, Loader2, Search, AlertTriangle, X, Mail, MailX } from 'lucide-react';
import { toast } from 'sonner';
import { useUsuarios, useCreateUsuario, useUpdateUsuarioRole, useDeleteUsuario } from '../hooks/useUsuarios';
import { useAuth } from '../lib/AuthContext';
import Button from '../components/ui/Button';
import { TableSkeleton } from '../components/ui/Skeleton';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/ui/EmptyState';

const roleLabels = { admin: 'Admin', gestor: 'Gestor', funcionario: 'Funcion\u00e1rio' };
const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  gestor: 'bg-yellow-100 text-yellow-700',
  funcionario: 'bg-gray-100 text-gray-700',
};

export default function Usuarios() {
  const { user, profile } = useAuth();
  const userRole = profile?.role || user?.role || 'funcionario';
  const isAdminOrGestor = userRole === 'admin' || userRole === 'gestor';
  const [showCreate, setShowCreate] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ fullName: '', password: '', role: 'funcionario', email: '', temEmail: true });
  const [creating, setCreating] = useState(false);

  const handleSearch = () => setSearchTerm(searchInput);
  const clearSearch = () => { setSearchInput(''); setSearchTerm(''); };

  const { data: usuarios, isLoading, isError, error, refetch } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const updateRole = useUpdateUsuarioRole();
  const deleteUsuario = useDeleteUsuario();

  const adminGestorCount = usuarios.filter((u) => u.role === 'gestor' || u.role === 'admin').length;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Preencha o nome'); return; }
    if (!form.password.trim() || form.password.length < 6) { toast.error('Senha m\u00ednima: 6 caracteres'); return; }
    if (form.temEmail && form.email && !form.email.includes('@')) { toast.error('E-mail inv\u00e1lido'); return; }
    setCreating(true);
    try {
      await createUsuario.mutateAsync({
        fullName: form.fullName.trim(),
        password: form.password,
        role: form.temEmail ? form.role : 'funcionario',
        email: form.temEmail ? (form.email || undefined) : undefined,
        temEmail: form.temEmail,
      });
      toast.success(`Usu\u00e1rio ${form.fullName} criado com sucesso!`);
      setForm({ fullName: '', password: '', role: 'funcionario', email: '', temEmail: true });
      setShowCreate(false);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao criar usu\u00e1rio');
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (userId === user?.id) {
      toast.error('Voc\u00ea n\u00e3o pode mudar sua pr\u00f3pria fun\u00e7\u00e3o');
      return;
    }
    const target = usuarios.find((u) => u.id === userId);
    const adminCount = usuarios.filter((u) => u.role === 'admin').length;
    if (target && target.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      toast.error('Deve haver pelo menos um admin no sistema.');
      return;
    }
    if (target && target.role === 'gestor' && newRole === 'funcionario' && adminGestorCount <= 1) {
      toast.error('Deve haver pelo menos um gestor no sistema.');
      return;
    }
    try {
      await updateRole.mutateAsync({ id: userId, role: newRole, currentUserId: user?.id });
      toast.success(`Fun\u00e7\u00e3o alterada para ${roleLabels[newRole]}`);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao alterar fun\u00e7\u00e3o');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user?.id) {
      toast.error('Voc\u00ea n\u00e3o pode remover seu pr\u00f3prio usu\u00e1rio');
      return;
    }
    const target = usuarios.find((u) => u.id === userId);
    if (target && target.role === 'admin' && usuarios.filter(u => u.role === 'admin').length <= 1) {
      toast.error('Deve haver pelo menos um admin no sistema.');
      return;
    }
    if (!window.confirm(`Remover o usu\u00e1rio ${target?.fullName || 'este usu\u00e1rio'}?`)) return;
    try {
      await deleteUsuario.mutateAsync({ id: userId, currentUserId: user?.id });
      toast.success('Usu\u00e1rio removido');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover usu\u00e1rio');
    }
  };

  if (isLoading) return <div className="p-4 md:p-6"><TableSkeleton rows={5} cols={4} /></div>;
  if (isError) return <div className="p-4 md:p-6"><ErrorDisplay error={error} onRetry={refetch} /></div>;

  if (!isAdminOrGestor) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores e gestores podem gerenciar usu\u00e1rios." />
      </div>
    );
  }

  const filtered = usuarios.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.fullName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4 md:space-y-6 px-3 sm:px-0 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gest\u00e3o de Usu\u00e1rios</h2>
          <p className="text-xs sm:text-sm text-gray-500">{usuarios.length} usu\u00e1rios cadastrados | {adminGestorCount} gestor(es)</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(!showCreate)} className="w-full sm:w-auto">
          {showCreate ? 'Fechar' : 'Novo Usuario'}
        </Button>
      </div>

      {adminGestorCount <= 1 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-yellow-700">Apenas {adminGestorCount} administrador(es)/gestor(es) no sistema. N\u00e3o \u00e9 poss\u00edvel remover o \u00faltimo.</p>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Usu\u00e1rio</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.temEmail}
                  onChange={(e) => setForm({ ...form, temEmail: e.target.checked, role: e.target.checked ? form.role : 'funcionario' })}
                  className="w-4 h-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400" />
                <span className="text-sm font-medium text-gray-700">Recebe e-mail</span>
              </label>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">
                {form.temEmail ? 'Notifica\u00e7\u00f5es por e-mail ativas' : 'Apenas login por nome (funcion\u00e1rio)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo *</label>
                <input type="text" required value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input-base" placeholder="Nome do usu\u00e1rio" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha * (min. 6 caracteres)</label>
                <input type="password" required value={form.password} minLength={6}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-base" placeholder="Senha" />
              </div>
              {form.temEmail && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email (opcional)</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-base" placeholder="email@exemplo.com" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Se vazio, gera email interno automaticamente</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fun\u00e7\u00e3o *</label>
                <select value={form.temEmail ? form.role : 'funcionario'} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  disabled={!form.temEmail}
                  className="input-base disabled:opacity-50 disabled:bg-gray-100">
                  <option value="funcionario">Funcion\u00e1rio</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Admin</option>
                </select>
                {!form.temEmail && <p className="text-[10px] text-orange-500 mt-0.5">Usu\u00e1rios sem e-mail s\u00f3 podem ser funcion\u00e1rios</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" icon={creating ? Loader2 : Plus} disabled={creating} className="w-full sm:w-auto">
                {creating ? 'Criando...' : 'Criar Usu\u00e1rio'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); setForm({ fullName: '', password: '', role: 'funcionario', email: '', temEmail: true }); }} className="w-full sm:w-auto">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usu\u00e1rio" description="Crie o primeiro usu\u00e1rio clicando no bot\u00e3o acima." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-3 sm:px-4 py-3 font-medium">Nome</th>
                  <th className="px-3 sm:px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="px-3 sm:px-4 py-3 font-medium">Fun\u00e7\u00e3o</th>
                  <th className="px-3 sm:px-4 py-3 font-medium">A\u00e7\u00f5es</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isCurrentUser = u.id === user?.id;
                  const isGestorAdmin = u.role === 'gestor' || u.role === 'admin';
                  const canDemote = isGestorAdmin && adminGestorCount <= 1;
                  const semEmail = u.tem_email === false;
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-gray-900">
                              {(u.fullName || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.fullName}</p>
                            {isCurrentUser && <p className="text-xs text-yellow-600">(Voc\u00ea)</p>}
                            <p className="text-[10px] text-gray-400 sm:hidden truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          {semEmail ? <MailX className="w-3 h-3 text-orange-400 flex-shrink-0" /> : <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                          <span className={semEmail ? 'text-orange-500' : ''}>{u.email}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                            {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {roleLabels[u.role]}
                          </span>
                          {semEmail && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-100 text-orange-600 w-fit">
                              <MailX className="w-2.5 h-2.5" /> Sem email
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {u.role === 'funcionario' && (
                            <>
                              <button onClick={() => handleChangeRole(u.id, 'gestor')} disabled={isCurrentUser || semEmail}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                                title={semEmail ? 'Usu\u00e1rios sem e-mail n\u00e3o podem ser promovidos' : ''}>
                                Gestor
                              </button>
                              <button onClick={() => handleChangeRole(u.id, 'admin')} disabled={isCurrentUser || semEmail}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-50"
                                title={semEmail ? 'Usu\u00e1rios sem e-mail n\u00e3o podem ser promovidos' : ''}>
                                Admin
                              </button>
                            </>
                          )}
                          {u.role === 'gestor' && (
                            <>
                              <button onClick={() => handleChangeRole(u.id, 'funcionario')} disabled={isCurrentUser || canDemote}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                title={canDemote ? 'Deve haver pelo menos um gestor' : ''}>
                                Func.
                              </button>
                              <button onClick={() => handleChangeRole(u.id, 'admin')} disabled={isCurrentUser}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-50">
                                Admin
                              </button>
                            </>
                          )}
                          {u.role === 'admin' && (
                            <>
                              <button onClick={() => handleChangeRole(u.id, 'gestor')} disabled={isCurrentUser || canDemote}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                                title={canDemote ? 'Deve haver pelo menos um admin' : ''}>
                                Gestor
                              </button>
                              <button onClick={() => handleChangeRole(u.id, 'funcionario')} disabled={isCurrentUser || canDemote}
                                className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                title={canDemote ? 'Deve haver pelo menos um admin' : ''}>
                                Func.
                              </button>
                            </>
                          )}
                          {!isCurrentUser && (
                            <button onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remover usu\u00e1rio">
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
