import { Menu, Bell, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle, setMobileOpen }) {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/historico?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    } else {
      navigate('/historico');
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4">
      <button className="lg:hidden text-gray-600 hover:text-gray-900" onClick={() => setMobileOpen(true)}>
        <Menu size={22} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-[#1C1C1C] leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {searchOpen ? (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') { setSearchOpen(false); setSearchTerm(''); } }}
              placeholder="Buscar..."
              className="bg-transparent text-sm outline-none w-32 sm:w-48"
            />
            <button onClick={() => { setSearchOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-gray-600">
              <span className="text-xs">X</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-sm transition-colors">
            <Search size={15} /><span className="text-xs">Buscar...</span>
          </button>
        )}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(!showNotif)}
            className="relative text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={20} />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
              <div className="p-3 border-b">
                <h4 className="text-sm font-bold text-gray-900">Notificacoes</h4>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma notificacao no momento</p>
              </div>
              <div className="p-2 border-t">
                <button onClick={() => { setShowNotif(false); navigate('/historico'); }}
                  className="w-full text-xs text-yellow-600 hover:text-yellow-700 font-medium py-1.5 rounded-lg hover:bg-yellow-50 transition-colors">
                  Ver Historico
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
