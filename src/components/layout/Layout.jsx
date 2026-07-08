import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Visao geral do sistema' },
  '/ordens': { title: 'Ordens de Servico', subtitle: 'Gestao de OS abertas e concluidas' },
  '/equipamentos': { title: 'Equipamentos', subtitle: 'Locacoes e disponibilidade' },
  '/contratos': { title: 'Contratos', subtitle: 'Contratos ativos, vencendo e vencidos' },
  '/comprovantes': { title: 'Documentos', subtitle: 'Comprovantes de entrega e devolucao' },
  '/devolucoes': { title: 'Devolucoes', subtitle: 'Devolucao de bens locados' },
  '/assinatura': { title: 'Assinatura Digital', subtitle: 'Assine contratos e documentos' },
  '/historico': { title: 'Historico de Transacoes', subtitle: 'Todas as movimentacoes do sistema' },
  '/usuarios': { title: 'Gestao de Usuarios', subtitle: 'Cadastrar e gerenciar funcoes' },
  '/perfil': { title: 'Meu Perfil', subtitle: 'Informacoes e relatorios' },
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'TransObra', subtitle: '' };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="lg:ml-60">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} setMobileOpen={setMobileOpen} />
        <main className="p-4 md:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
