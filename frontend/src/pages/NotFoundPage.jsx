/**
 * =============================================================================
 * NotFoundPage Component
 * =============================================================================
 * Custom error 404 component styled with the cybersecurity theme.
 * =============================================================================
 */

import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center align-items-center my-5" style={{ minHeight: '60vh' }}>
        <div className="col-md-7">
          <div className="glass-card p-5">
            <div className="display-1 text-danger fw-extrabold mb-3 font-monospace" style={{ letterSpacing: '2px' }}>
              404
            </div>
            
            <div className="badge bg-dark border border-danger text-danger px-3 py-2 mb-4 font-monospace">
              RESOURCE UNRESOLVED / ERROR 404
            </div>
            
            <h2 className="text-white mb-3">Unauthorized Route Request</h2>
            <p className="text-muted mb-5 mx-auto" style={{ maxWidth: '500px' }}>
              The requested address does not map to any recognized endpoint in this secure environment.
              Please check the URL parameter or navigate back to safety.
            </p>
            
            <Link to="/" className="btn btn-cyber px-4 py-2">
              <i className="bi bi-shield-fill-exclamation me-2"></i> Return to Safe Zone
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
