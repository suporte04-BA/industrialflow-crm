import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../../lib/supabase';
import { supabase, isConfigured } from '../../lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Preencha o nome completo'); return; }
    if (!form.email.trim()) { toast.error('Preencha o email'); return; }
    if (!form.email.includes('@')) { toast.error('Email invalido'); return; }
    if (!form.password || form.password.length < 6) { toast.error('Senha deve ter no minimo 6 caracteres'); return; }
    if (form.password !== form.confirmPassword) { toast.error('As senhas nao conferem'); return; }

    if (!isConfigured()) {
      toast.error('Supabase nao configurado. Verifique as variaveis de ambiente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp(form.email, form.password, form.fullName);
      if (error) throw error;

      if (data.session) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: form.fullName,
            email: form.email,
            role: 'funcionario',
          }, { onConflict: 'id' }).catch(() => null);
        toast.success('Conta criada com sucesso!');
        navigate('/');
      } else if (data.user) {
        toast.success('Conta criada! Verifique seu email para confirmar e depois faca login.');
        navigate('/login');
      } else {
        toast.success('Conta criada! Faca login para acessar.');
        navigate('/login');
      }
    } catch (err) {
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        toast.error('Este email ja esta cadastrado. Faca login.');
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
          <img src="/logo.jpg" alt="TransObra" className="h-20 w-auto" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
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
              <ArrowLeft className="w-3 h-3" /> Ja tenho conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
