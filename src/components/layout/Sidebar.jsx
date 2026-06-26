import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Package, FileText, PenLine, X, ChevronRight, ClipboardCheck, LogOut, User, History, Users } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';

const gestorNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Ordens de Servico', icon: ClipboardList, path: '/ordens' },
  { label: 'Equipamentos', icon: Package, path: '/equipamentos' },
  { label: 'Contratos', icon: FileText, path: '/contratos' },
  { label: 'Comprovantes', icon: ClipboardCheck, path: '/comprovantes' },
  { label: 'Assinatura Digital', icon: PenLine, path: '/assinatura' },
];

const gestorNavSec = [
  { label: 'Historico', icon: History, path: '/historico' },
  { label: 'Usuarios', icon: Users, path: '/usuarios' },
  { label: 'Meu Perfil', icon: User, path: '/perfil' },
];

const funcionarioNav = [
  { label: 'Comprovantes', icon: ClipboardCheck, path: '/comprovantes' },
  { label: 'Assinatura Digital', icon: PenLine, path: '/assinatura' },
  { label: 'Meu Perfil', icon: User, path: '/perfil' },
];

function NavLink({ item, onNavigate }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Link to={item.path} onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-3 transition-all duration-150 group ${isActive ? 'bg-yellow-400 text-[#1C1C1C] font-semibold shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      <item.icon size={16} className={isActive ? 'text-[#1C1C1C]' : 'text-gray-500 group-hover:text-white flex-shrink-0'} />
      <span className="text-[13px]">{item.label}</span>
      {isActive && <ChevronRight size={12} className="ml-auto text-[#1C1C1C] opacity-60" />}
    </Link>
  );
}

function SidebarContent({ navItems, navItemsSec, userName, userEmail, userRole, currentRole, initials, switchRole, handleLogout, onNavigate, avatarUrl }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-0.5">
          {navItems.map(item => <NavLink key={item.path} item={item} onNavigate={onNavigate} />)}
        </nav>

        {navItemsSec.length > 0 && (
          <>
            <div className="mx-5 my-3 border-t border-white/5" />
            <nav className="space-y-0.5">
              {navItemsSec.map(item => <NavLink key={item.path} item={item} onNavigate={onNavigate} />)}
            </nav>
          </>
        )}
      </div>

      <div className="px-3 pb-3">
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-3 px-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-gray-900">{initials}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-[12px] font-medium truncate">{userName}</p>
              <p className="text-gray-500 text-[10px] truncate">{userEmail}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded bg-white/10 text-gray-400 capitalize">{userRole}</span>
            </div>
          </div>

          <div className="flex gap-1 mb-3 px-1">
            <button onClick={() => switchRole('gestor')}
              className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-colors ${currentRole === 'gestor' ? 'bg-yellow-400 text-[#1C1C1C]' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
              Gestor
            </button>
            <button onClick={() => switchRole('funcionario')}
              className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-colors ${currentRole === 'funcionario' ? 'bg-yellow-400 text-[#1C1C1C]' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
              Funcionario
            </button>
          </div>

          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={16} />
            <span className="text-[13px]">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, profile, logout, isGestor, viewRole, setViewRole } = useAuth();
  const currentRole = viewRole || profile?.role || 'gestor';
  const navItems = isGestor ? gestorNav : funcionarioNav;
  const navItemsSec = isGestor ? gestorNavSec : [];
  const userName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const userEmail = profile?.email || user?.email || 'admin@transobra.com';
  const userRole = currentRole === 'admin' ? 'Admin' : currentRole === 'gestor' ? 'Gestor' : 'Funcionario';
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado!');
    window.location.href = '/login';
  };

  const switchRole = (newRole) => {
    setViewRole(newRole);
    toast.success(`Visualizando como ${newRole === 'gestor' ? 'Gestor' : 'Funcionario'}`);
  };

  const onNavigate = () => setMobileOpen(false);

  const sidebarProps = { navItems, navItemsSec, userName, userEmail, userRole, currentRole, initials, switchRole, handleLogout, onNavigate, avatarUrl: profile?.avatarUrl };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#1C1C1C] fixed left-0 top-0 z-30">
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/5">
          <img src="/logo.jpg" alt="TransObra" className="h-9 w-auto" />
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-full w-60 bg-[#1C1C1C] z-50 lg:hidden flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <img src="/logo.jpg" alt="TransObra" className="h-8 w-auto" />
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>
    </>
  );
}
