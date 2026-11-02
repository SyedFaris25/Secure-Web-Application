/**
 * =============================================================================
 * ProtectedRoute Guard Component
 * =============================================================================
 * SECURITY FEATURES:
 *   - Route protection: Automatically redirects unauthenticated users to the
 *     login page.
 *   - Remembers the attempted destination to redirect back upon login.
 *
 * OWASP PROTECTIONS:
 *   - Broken Access Control: Prevents client-side access to protected pages.
 * =============================================================================
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <LoadingSpinner message="Verifying security credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and store the original location user wanted to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
