/**
 * =============================================================================
 * ErrorPage Component — Secure File Vault
 * =============================================================================
 * Styled error screen handling multiple production errors (500, Offline,
 * Network Failure, Unauthorized access, Session expiration).
 * =============================================================================
 */

import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const ErrorPage = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || '500';

  const getErrorContent = () => {
    switch (type) {
      case 'offline':
      case 'network':
        return {
          code: 'CONNECTION_FAILURE',
          badge: 'BACKEND OFFLINE / NETWORK ERROR',
          title: 'Secure Vault Offline',
          description: 'The frontend is unable to establish an encrypted socket connection with the backend API. The backend server on Render might be sleeping or offline. Please wait a moment for the instance to spin up and reload the page.',
          actionText: 'Retry Connection',
          actionUrl: '/dashboard',
          isLink: false
        };
      case 'unauthorized':
        return {
          code: '403_FORBIDDEN',
          badge: 'ACCESS DENIED',
          title: 'Unauthorized Action',
          description: 'You do not possess the required RBAC credentials to view this directory block. Admin privileges are logged and audited on the server.',
          actionText: 'Return to Drive',
          actionUrl: '/dashboard',
          isLink: true
        };
      case 'expired':
        return {
          code: 'SESSION_EXPIRATION',
          badge: 'TOKEN REVOKED / EXPIRED',
          title: 'Secure Session Timeout',
          description: 'Your short-lived JWT token has expired or has been revoked by a logout command. Please login again to re-key your cryptographic session.',
          actionText: 'Re-authenticate Session',
          actionUrl: '/login',
          isLink: true
        };
      case '500':
      default:
        return {
          code: '500_INTERNAL_ERROR',
          badge: 'SERVER CRITICAL EXCEPTION',
          title: 'Internal Server Error',
          description: 'The Flask API encountered an unexpected database query error or unhandled runtime crash. The exception is logged for diagnostic review.',
          actionText: 'Return to Safe Zone',
          actionUrl: '/',
          isLink: true
        };
    }
  };

  const content = getErrorContent();

  const handleActionClick = () => {
    if (!content.isLink) {
      window.location.reload();
    }
  };

  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center align-items-center my-5" style={{ minHeight: '60vh' }}>
        <div className="col-md-8">
          <div className="glass-card p-5">
            <div className="display-4 text-danger fw-bold mb-3 font-monospace" style={{ letterSpacing: '2px' }}>
              {content.code}
            </div>
            
            <div className="badge bg-dark border border-danger text-danger px-3 py-2 mb-4 font-monospace">
              {content.badge}
            </div>
            
            <h2 className="text-white mb-3">{content.title}</h2>
            <p className="text-muted mb-5 mx-auto" style={{ maxWidth: '550px' }}>
              {content.description}
            </p>
            
            {content.isLink ? (
              <Link to={content.actionUrl} className="btn btn-cyber px-4 py-2">
                <i className="bi bi-shield-fill-exclamation me-2"></i> {content.actionText}
              </Link>
            ) : (
              <button onClick={handleActionClick} className="btn btn-cyber px-4 py-2">
                <i className="bi bi-arrow-clockwise me-2"></i> {content.actionText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
