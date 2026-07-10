import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './lib/AuthContext';
import { useContractAlerts } from './hooks/useContractAlerts';
import ErrorBoundary from './components/layout/ErrorBoundary';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/auth/PrivateRoute';
import RoleGuard from './components/auth/RoleGuard';


const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrdensServico = lazy(() => import('./pages/OrdensServico'));
const Equipamentos = lazy(() => import('./pages/Equipamentos'));
const Contratos = lazy(() => import('./pages/Contratos'));
const AssinaturaDigital = lazy(() => import('./pages/AssinaturaDigital'));
const Documentos = lazy(() => import('./pages/Documentos'));
const HistoricoTransacoes = lazy(() => import('./pages/HistoricoTransacoes'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const OSDetailPage = lazy(() => import('./pages/OSDetailPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Carregando...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.code === 'SUPABASE_AUTH') return false;
        if (error?.message?.includes('Unauthorized') || error?.message?.includes('401')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 15000,
    },
  },
});

// Main App component
function AppInner() {
  useContractAlerts();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppInner />
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></RoleGuard>} />
                <Route path="/ordens" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><OrdensServico /></Suspense></RoleGuard>} />
                <Route path="/equipamentos" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><Equipamentos /></Suspense></RoleGuard>} />
                <Route path="/contratos" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><Contratos /></Suspense></RoleGuard>} />
                <Route path="/comprovantes" element={<Suspense fallback={<PageLoader />}><Documentos /></Suspense>} />
                <Route path="/assinatura" element={<Suspense fallback={<PageLoader />}><AssinaturaDigital /></Suspense>} />
                <Route path="/historico" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><HistoricoTransacoes /></Suspense></RoleGuard>} />
                <Route path="/usuarios" element={<RoleGuard requiredRole="gestor"><Suspense fallback={<PageLoader />}><Usuarios /></Suspense></RoleGuard>} />
<Route path="/perfil" element={<Suspense fallback={<PageLoader />}><Perfil /></Suspense>} />
              <Route path="/os-detail/:id" element={<Suspense fallback={<PageLoader />}><OSDetailPage /></Suspense>} />
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
