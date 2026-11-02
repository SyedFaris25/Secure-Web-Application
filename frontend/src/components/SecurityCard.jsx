/**
 * =============================================================================
 * SecurityCard Component
 * =============================================================================
 * Cards rendering specific security details in the Security Center.
 * =============================================================================
 */

import React from 'react';
import StatusBadge from './StatusBadge';

const SecurityCard = ({ name, description, status, category }) => {
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'authentication':
        return 'bi-shield-lock';
      case 'injection':
        return 'bi-database-fill-gear';
      case 'xss':
        return 'bi-code-slash';
      case 'misconfiguration':
        return 'bi-gear-wide-connected';
      case 'exposure':
        return 'bi-eye-slash-fill';
      default:
        return 'bi-shield-check';
    }
  };

  return (
    <div className="card glass-card h-100">
      <div className="card-body d-flex flex-column justify-content-between p-4">
        <div>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div 
              className="d-flex align-items-center justify-content-center bg-dark border border-secondary rounded-3 text-cyber-accent"
              style={{ width: '45px', height: '45px', fontSize: '1.25rem' }}
            >
              <i className={`bi ${getCategoryIcon(category)}`}></i>
            </div>
            <StatusBadge active={status} labelActive="SECURED" labelInactive="INSECURE" />
          </div>
          
          <h5 className="card-title text-light mb-2">{name}</h5>
          <p className="card-text text-muted small lh-base">{description}</p>
        </div>
        
        <div className="mt-3 pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center gap-2">
          <i className="bi bi-patch-check-fill text-success"></i>
          <span className="text-success font-monospace" style={{ fontSize: '0.75rem' }}>
            OWASP PROTECTION COMPLIANT
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecurityCard;
