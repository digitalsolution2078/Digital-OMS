import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-provider';
import { Toaster } from '@/components/ui/sonner';

// Pages
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import OrdersPage from './pages/orders';
import OrderDetailPage from './pages/order-detail';
import CustomersPage from './pages/customers';
import PublicTrackPage from './pages/public/track';
import Layout from './components/layout/main-layout';
import ServicesPage from './pages/services';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (adminOnly && profile.role !== 'admin') return <Navigate to="/" replace />;
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track/:token" element={<PublicTrackPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute adminOnly><ServicesPage /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
