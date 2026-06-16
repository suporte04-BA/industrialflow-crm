import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Visao geral do sistema' },
  '/ordens': { title: 'Ordens de Servico', subtitle: 'Gestao de OS abertas e concluidas' },
  '/equipamentos': { title: 'Equipamentos', subtitle: 'Locacoes e disponibilidade' },
  '/contratos': { title: 'Contratos', subtitle: 'Contratos ativos, vencendo e vencidos' },
  '/comprovantes': { title: 'Comprovantes de Entrega', subtitle: 'Bens locados entregues e registrados' },
  '/assinatura': { title: 'Assinatura Digital', subtitle: 'Assine contratos e documentos' },
  '/bloco-notas': { title: 'Bloco de Notas', subtitle: 'Anotacoes e lembretes' },
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'CRM Industrial', subtitle: '' };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-inter">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} setMobileOpen={setMobileOpen} />
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
