
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from './components/layout/MainLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import { ProductCreatePage } from './pages/ProductCreatePage';
import { ProductEditPage } from './pages/ProductEditPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ThankYouPage } from './pages/ThankYouPage';
import { VendasPage } from './pages/VendasPage';
import { ClientesPage } from './pages/ClientesPage';
import { CarrinhosAbandonadosPage } from './pages/CarrinhosAbandonadosPage';
import { FinancasPage } from './pages/FinancasPage';
import { IntegracoesPage } from './pages/IntegracoesPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';

// Super Admin Pages
import { SuperAdminDashboardPage } from './pages/superadmin/SuperAdminDashboardPage';
import { PlatformSettingsPage } from './pages/superadmin/PlatformSettingsPage';
import { SuperAdminUsersPage } from './pages/superadmin/SuperAdminUsersPage';
import { SuperAdminSalesPage } from './pages/superadmin/SuperAdminSalesPage';
import { SuperAdminAuditLogPage } from './pages/superadmin/SuperAdminAuditLogPage';
import { SuperAdminAllProductsPage } from './pages/superadmin/SuperAdminAllProductsPage';

import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner'; 

// ProtectedRoute: Ensures only authenticated users can access these routes.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

// SuperAdminProtectedRoute: Ensures only authenticated super admins can access these routes.
const SuperAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isSuperAdmin) {
    // If authenticated but not super admin, redirect to regular dashboard.
    // If not authenticated at all, redirect to auth.
    return <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />;
  }
  return <>{children}</>;
};


function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/thank-you/:orderId" element={<ThankYouPage />} />
        
        {/* Regular User Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardPage /></MainLayout></ProtectedRoute>} />
        <Route path="/produtos" element={<ProtectedRoute><MainLayout><ProductsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/produtos/novo" element={<ProtectedRoute><MainLayout><ProductCreatePage /></MainLayout></ProtectedRoute>} />
        <Route path="/produtos/editar/:productId" element={<ProtectedRoute><MainLayout><ProductEditPage /></MainLayout></ProtectedRoute>} />
        <Route path="/vendas" element={<ProtectedRoute><MainLayout><VendasPage /></MainLayout></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><MainLayout><ClientesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/carrinhos-abandonados" element={<ProtectedRoute><MainLayout><CarrinhosAbandonadosPage /></MainLayout></ProtectedRoute>} />
        <Route path="/financas" element={<ProtectedRoute><MainLayout><FinancasPage /></MainLayout></ProtectedRoute>} />
        <Route path="/integracoes" element={<ProtectedRoute><MainLayout><IntegracoesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><MainLayout><ConfiguracoesPage /></MainLayout></ProtectedRoute>} />
        
        {/* Super Admin Routes */}
        <Route 
          path="/superadmin/dashboard" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><SuperAdminDashboardPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />
        <Route 
          path="/superadmin/configuracoes-plataforma" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><PlatformSettingsPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />
         <Route 
          path="/superadmin/usuarios" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><SuperAdminUsersPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />
         <Route 
          path="/superadmin/vendas-gerais" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><SuperAdminSalesPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />
        <Route 
          path="/superadmin/audit-log" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><SuperAdminAuditLogPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />
        <Route 
          path="/superadmin/todos-produtos" 
          element={<SuperAdminProtectedRoute><SuperAdminLayout><SuperAdminAllProductsPage /></SuperAdminLayout></SuperAdminProtectedRoute>} 
        />

        {/* Catch-all route for authenticated users */}
        <Route 
          path="*" 
          element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
