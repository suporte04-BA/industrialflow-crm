import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signInByName, isConfigured, loadConfig } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', password: '' });

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      const isGestor = profile?.role === 'admin' || profile?.role === 'gestor';
      navigate(isGestor ? '/' : '/comprovantes', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Preencha o nome/email'); return; }
    if (!form.password.trim()) { toast.error('Preencha a senha'); return; }

    await loadConfig();
    if (!isConfigured()) {
      toast.error('Supabase nao configurado. Verifique as variaveis de ambiente.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = form.name.includes('@');
      let result;

      if (isEmail) {
        result = await signIn(form.name, form.password);
      } else {
        result = await signInByName(form.name, form.password);
      }

      if (result.error) throw result.error;

      toast.success('Login realizado!');
    } catch (err) {
      if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else if (err.message?.includes('Invalid login') || err.message?.includes('invalid_credentials')) {
        toast.error('Email ou senha incorretos. Verifique seus dados.');
      } else if (err.message?.includes('Email not confirmed')) {
        toast.error('Email nao confirmado. Verifique sua caixa de entrada.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        toast.error('Erro de conexao. Verifique sua internet e tente novamente.');
      } else {
        toast.error(err.message || 'Erro ao fazer login');
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
          <h1 className="text-2xl font-bold text-[#1C1C1C] mb-6">Entrar</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium">Nome ou E-mail</label>
              <input type="text" required value={form.name} autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Digite seu nome ou email" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Senha</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Sua senha" minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-yellow-400 text-[#1C1C1C] font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Aguarde...' : 'Entrar'}
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-400 text-center">
            Digite seu nome e senha para acessar o sistema.
          </p>
          <div className="mt-3 text-center">
            <Link to="/cadastro" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
              Criar uma conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
