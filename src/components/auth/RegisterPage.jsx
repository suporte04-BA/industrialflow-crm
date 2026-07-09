import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, isConfigured, loadConfig } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Preencha o nome completo'); return; }
    if (!form.email.trim()) { toast.error('Preencha o e-mail'); return; }
    if (!form.email.includes('@')) { toast.error('E-mail inválido'); return; }
    if (!form.password || form.password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
    if (form.password !== form.confirmPassword) { toast.error('As senhas não conferem'); return; }

    await loadConfig();
    if (!isConfigured()) {
      toast.error('Supabase não configurado. Verifique as variáveis de ambiente.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || 'Erro ao criar conta';
        if (msg.includes('already') || msg.includes('exists') || msg.includes('ja esta cadastrado')) {
          toast.error('Este e-mail já está cadastrado. Faça login.');
        } else if (msg.includes('rate limit')) {
          toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          toast.error(msg);
        }
        return;
      }

      const signInResult = await signIn(form.email, form.password);
      if (signInResult.error) {
        toast.success('Conta criada com sucesso! Faça login.');
        navigate('/login');
        return;
      }

        toast.success('Conta criada com sucesso! Login automático realizado.');
      const userRole = profile?.role || 'funcionario';
      const isGestor = userRole === 'admin' || userRole === 'gestor';
      navigate(isGestor ? '/' : '/comprovantes', { replace: true });
    } catch (err) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error(err.message || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="TransObra" className="h-20 w-auto" translate="no" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-[#1C1C1C] mb-2">Criar Conta</h1>
          <p className="text-sm text-gray-500 mb-6">Preencha os dados para se cadastrar no sistema.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium">Nome Completo *</label>
              <input type="text" required value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Seu nome completo" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Email *</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="seu@email.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Senha *</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Minimo 6 caracteres" minLength={6} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Confirmar Senha *</label>
              <input type="password" required value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Repita a senha" minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-yellow-400 text-[#1C1C1C] font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
