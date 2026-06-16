import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp, isConfigured } from '../../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Wrench } from 'lucide-react';
import Button from '../ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfigured()) {
      toast.info('Modo demo: configurando acesso...');
      localStorage.setItem('industrialflow_mock_auth', 'true');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-4">
            <Wrench className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">IndustrialFlow</h1>
          <p className="text-gray-400 mt-2">CRM de Locacao de Equipamentos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{isLogin ? 'Entrar' : 'Criar Conta'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input-base" placeholder="Seu nome" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-base" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-base" placeholder="Sua senha" minLength={6} />
            </div>
            <Button type="submit" className="w-full" icon={loading ? Loader2 : null} disabled={loading}>
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-yellow-600 hover:text-yellow-700">
              {isLogin ? 'Nao tem conta? Criar uma' : 'Ja tem conta? Entrar'}
            </button>
          </div>
          {!isConfigured() && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 text-center">
                Supabase nao configurado. Clique em <strong>Entrar</strong> para acessar o modo demo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
