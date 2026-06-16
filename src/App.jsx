import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/layout/ErrorBoundary';

import Layout from './components/layout/Layout';
import LoginPage from './components/auth/LoginPage';
import PrivateRoute from './components/auth/PrivateRoute';
import Dashboard from './pages/Dashboard';
import OrdensServico from './pages/OrdensServico';
import Equipamentos from './pages/Equipamentos';
import Contratos from './pages/Contratos';
import AssinaturaDigital from './pages/AssinaturaDigital';
import ComprovanteEntrega from './pages/ComprovanteEntrega';
import BlocoNotas from './pages/BlocoNotas';

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
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ordens" element={<OrdensServico />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/comprovantes" element={<ComprovanteEntrega />} />
              <Route path="/assinatura" element={<AssinaturaDigital />} />
              <Route path="/bloco-notas" element={<BlocoNotas />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster
          position="bottom-right"
          toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontSize: '13px' } }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
