import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './lib/AuthContext';
import ErrorBoundary from './components/layout/ErrorBoundary';

import Layout from './components/layout/Layout';
import LoginPage from './components/auth/LoginPage';
import PrivateRoute from './components/auth/PrivateRoute';
import RoleGuard from './components/auth/RoleGuard';
import Dashboard from './pages/Dashboard';
import OrdensServico from './pages/OrdensServico';
import Equipamentos from './pages/Equipamentos';
import Contratos from './pages/Contratos';
import AssinaturaDigital from './pages/AssinaturaDigital';
import ComprovanteEntrega from './pages/ComprovanteEntrega';
import HistoricoTransacoes from './pages/HistoricoTransacoes';
import Perfil from './pages/Perfil';
import Usuarios from './pages/Usuarios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.code === 'SUPABASE_AUTH') return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
               <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                 <Route path="/" element={<RoleGuard requiredRole="gestor"><Dashboard /></RoleGuard>} />
                 <Route path="/ordens" element={<RoleGuard requiredRole="gestor"><OrdensServico /></RoleGuard>} />
                 <Route path="/equipamentos" element={<RoleGuard requiredRole="gestor"><Equipamentos /></RoleGuard>} />
                 <Route path="/contratos" element={<RoleGuard requiredRole="gestor"><Contratos /></RoleGuard>} />
                 <Route path="/comprovantes" element={<ComprovanteEntrega />} />
                 <Route path="/assinatura" element={<AssinaturaDigital />} />
                 <Route path="/historico" element={<RoleGuard requiredRole="gestor"><HistoricoTransacoes /></RoleGuard>} />
                 <Route path="/usuarios" element={<RoleGuard requiredRole="gestor"><Usuarios /></RoleGuard>} />
                 <Route path="/perfil" element={<Perfil />} />
               </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <Toaster
            position="bottom-right"
            toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontSize: '13px' } }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
