import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/shared/Sidebar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import Students from './components/students/Students';
import MarksEntry from './components/marks/MarksEntry';
import Reports from './components/reports/Reports';
import jamiaAhmadiyya from './jamia-ahmadiyya.jpg';

function PrivateLayout({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
  if (!admin) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <header className="app-header">
          <img src={jamiaAhmadiyya} alt="Jamia Ahmadiyya Bangladesh" />
          <div>
            <h1>Jamia Ahmadiyya Bangladesh</h1>
            <p>Result Management System</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return null;
  if (admin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
      <Route path="/students" element={<PrivateLayout><Students /></PrivateLayout>} />
      <Route path="/marks" element={<PrivateLayout><MarksEntry /></PrivateLayout>} />
      <Route path="/reports" element={<PrivateLayout><Reports /></PrivateLayout>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontSize: '13.5px',
              fontFamily: 'var(--font)',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
