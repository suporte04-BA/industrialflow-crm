import { useState } from 'react';
import { signIn, signUp } from '../../lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
        window.location.href = '/';
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success('Conta criada! Verifique seu email.');
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">⚙️</span>
          <h1 className="text-2xl font-bold text-[#1C1C1C] mt-3">IndustrialFlow</h1>
          <p className="text-sm text-gray-500 mt-1">CRM de Gestao de Equipamentos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs text-gray-500 font-medium">Nome Completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand text-[#1C1C1C] font-semibold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-gray-500 hover:text-[#1C1C1C]">
            {isLogin ? 'Nao tem conta? Criar agora' : 'Ja tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
