import { Menu, Bell, Search } from 'lucide-react';
import { useState } from 'react';

export default function Header({ title, subtitle, setMobileOpen }) {
  const [hasNotif] = useState(false);
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4">
      <button className="lg:hidden text-gray-600 hover:text-gray-900" onClick={() => setMobileOpen(true)}>
        <Menu size={22} />
      </button>
      <div className="flex-1">
        <h1 className="text-lg font-bold text-[#1C1C1C] leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden sm:flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-sm transition-colors">
          <Search size={15} /><span className="text-xs">Buscar...</span>
        </button>
        <button className="relative text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100">
          <Bell size={20} />
          {hasNotif && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full" />}
        </button>
      </div>
    </header>
  );
}
