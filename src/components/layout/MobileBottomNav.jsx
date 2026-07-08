import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileText, PenLine, ClipboardCheck, User, History } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

const gestorNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Ordens', icon: ClipboardList, path: '/ordens' },
  { label: 'Contratos', icon: FileText, path: '/contratos' },
  { label: 'Docs', icon: ClipboardCheck, path: '/comprovantes' },
  { label: 'Historico', icon: History, path: '/historico' },
];

const funcionarioNav = [
  { label: 'Comprovantes', icon: ClipboardCheck, path: '/comprovantes' },
  { label: 'Assinatura', icon: PenLine, path: '/assinatura' },
  { label: 'Perfil', icon: User, path: '/perfil' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { isGestor } = useAuth();
  const navItems = isGestor ? gestorNav : funcionarioNav;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-30 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors min-w-0 ${isActive ? 'text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-yellow-600' : 'text-gray-400'} />
              <span className={`text-[10px] font-medium truncate ${isActive ? 'text-yellow-600' : 'text-gray-400'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
