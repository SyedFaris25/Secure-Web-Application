/**
 * =============================================================================
 * Loading Spinner Component
 * =============================================================================
 * Custom styled cybersecurity progress/loading spinner.
 * =============================================================================
 */

import React from 'react';

const LoadingSpinner = ({ message = 'Loading securing environment...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center">
      <div className="position-relative mb-4">
        {/* outer glowing ring */}
        <div 
          className="spinner-border text-info" 
          role="status" 
          style={{ width: '4rem', height: '4rem', borderWidth: '0.25em' }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        {/* inner lock icon */}
        <div 
          className="position-absolute top-50 start-50 translate-middle text-cyber-accent"
          style={{ fontSize: '1.5rem', marginTop: '-2px' }}
        >
          <i className="bi bi-shield-lock-fill"></i>
        </div>
      </div>
      <p className="text-muted font-monospace small uppercase tracking-wider">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
