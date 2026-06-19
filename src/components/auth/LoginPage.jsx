import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp, isConfigured } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfigured()) {
      toast.info('Modo demo: Entrando como gestor...');
      loginAsDemo('gestor');
      navigate('/');
      return;
    }
    setLoading(true);
    try {
      const result = isLogin
        ? await signIn(form.email, form.password)
        : await signUp(form.email, form.password, form.fullName);
      if (result.error) throw result.error;
      toast.success(isLogin ? 'Login realizado!' : 'Conta criada! Verifique seu email.');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Erro na operacao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="TransObra" className="h-20 w-auto" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-[#1C1C1C] mb-6">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs text-gray-500 font-medium">Nome Completo</label>
                <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" placeholder="Seu nome" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 font-medium">E-mail</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Senha</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" placeholder="Sua senha" minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-yellow-400 text-[#1C1C1C] font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="mt-4 w-full text-xs text-gray-500 hover:text-gray-800">
            {isLogin ? 'Nao tem conta? Criar uma' : 'Ja tem conta? Entrar'}
          </button>
          {!isConfigured() && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 text-center mb-3">
                Supabase nao configurado. Clique abaixo para acessar o modo demo.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { loginAsDemo('gestor'); navigate('/'); }}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                >
                  Gestor
                </button>
                <button
                  onClick={() => { loginAsDemo('funcionario'); navigate('/'); }}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Funcionario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
