import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { KycVerification } from './pages/KycVerification';
import { Agents } from './pages/Agents';
import { AgentDetails } from './pages/AgentDetails';
import { Bookings } from './pages/Bookings';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Administration Shell */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="applications" element={<Applications />} />
                <Route path="kyc" element={<KycVerification />} />
                <Route path="agents" element={<Agents />} />
                <Route path="agents/:id" element={<AgentDetails />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
