/**
 * =============================================================================
 * App Entrypoint Component
 * =============================================================================
 * Configures routes, context providers, and global overlays.
 * =============================================================================
 */

import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ConfirmDialog from './components/ConfirmDialog';
import LoadingSpinner from './components/LoadingSpinner';

// Pages (Lazy loaded for optimal bundle size and loading speed)
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const SecurityCenterPage = lazy(() => import('./pages/SecurityCenterPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));

const AppContent = () => {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    showToast('You have been logged out securely.', 'info');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar onShowLogoutConfirm={() => setShowLogoutConfirm(true)} />
      
      <main className="flex-grow-1">
        <Suspense fallback={<LoadingSpinner message="Loading route resources..." />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/error" element={<ErrorPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/change-password" 
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/security" 
              element={
                <ProtectedRoute>
                  <SecurityCenterPage />
                </ProtectedRoute>
              } 
            />

            {/* Admin Route (role-guarded on backend) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Footer */}
      <footer className="py-4 border-top border-secondary border-opacity-25 mt-auto bg-dark">
        <div className="container text-center text-muted font-monospace small">
          <div>&copy; {new Date().getFullYear()} Secure Web Application. Built for educational demonstrations.</div>
          <div className="mt-1" style={{ fontSize: '0.7rem' }}>
            SQLi Protected | Password Bcrypt | CSRF Aware | JWT Authenticated
          </div>
        </div>
      </footer>

      {/* Global Confirmation Dialog for Logout */}
      <ConfirmDialog
        show={showLogoutConfirm}
        title="Confirm Secure Logout"
        message="Are you sure you want to terminate your current encrypted session?"
        confirmText="Confirm Logout"
        cancelText="Remain Signed In"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
