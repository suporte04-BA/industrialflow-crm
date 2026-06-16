import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Package, FileText, PenLine, X, ChevronRight, ClipboardCheck, BookOpen, LogOut } from 'lucide-react';
import { signOut } from '../../lib/supabase';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Ordens de Servico', icon: ClipboardList, path: '/ordens' },
  { label: 'Equipamentos', icon: Package, path: '/equipamentos' },
  { label: 'Contratos', icon: FileText, path: '/contratos' },
  { label: 'Comprovantes de Entrega', icon: ClipboardCheck, path: '/comprovantes' },
  { label: 'Assinatura Digital', icon: PenLine, path: '/assinatura' },
  { label: 'Bloco de Notas', icon: BookOpen, path: '/bloco-notas' },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('transobra_mock_auth');
    toast.success('Logout realizado!');
    window.location.href = '/login';
  };

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link to={item.path} onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition-all duration-150 group ${isActive ? 'bg-yellow-400 text-[#1C1C1C] font-semibold' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
        <item.icon size={18} className={isActive ? 'text-[#1C1C1C]' : 'text-gray-400 group-hover:text-white'} />
        <span className="text-sm">{item.label}</span>
        {isActive && <ChevronRight size={14} className="ml-auto text-[#1C1C1C]" />}
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#1C1C1C] fixed left-0 top-0 z-30">
        <div className="flex items-center justify-center px-4 py-5 border-b border-white/10">
          <img src="/logo.jpg" alt="TransObra" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-full w-64 bg-[#1C1C1C] z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <img src="/logo.jpg" alt="TransObra" className="h-10 w-auto" />
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="py-4 space-y-1">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
