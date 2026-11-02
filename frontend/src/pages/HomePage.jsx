/**
 * =============================================================================
 * HomePage Component
 * =============================================================================
 * Beautiful landing page explaining the secure web application concept.
 * =============================================================================
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      title: 'Secure Authentication',
      icon: 'bi-shield-lock-fill',
      description: 'Strong password policy, client/server validation, and robust verification processes.',
      mitigation: 'OWASP Protection: Broken Authentication',
    },
    {
      title: 'SQL Injection Protection',
      icon: 'bi-database-fill-check',
      description: 'Built on SQLAlchemy ORM using parameterized queries to safely handle database communication.',
      mitigation: 'OWASP Protection: Injection',
    },
    {
      title: 'JWT Authorization',
      icon: 'bi-key-fill',
      description: 'Access tokens and refresh tokens verify user identity securely without stateful sessions.',
      mitigation: 'OWASP Protection: Identification & Authentication Failures',
    },
    {
      title: 'Password Hashing',
      icon: 'bi-file-lock-fill',
      description: 'Bcrypt algorithm with a cost factor of 12 ensures passwords are never stored in plain text.',
      mitigation: 'OWASP Protection: Sensitive Data Exposure',
    },
    {
      title: 'XSS Mitigation',
      icon: 'bi-code-slash',
      description: 'Strict input sanitization via backend bleaching and automatic React HTML escaping filters.',
      mitigation: 'OWASP Protection: Cross Site Scripting (XSS)',
    },
    {
      title: 'Secure Headers',
      icon: 'bi-gear-fill',
      description: 'Custom HTTP response headers (CSP, HSTS, X-Frame-Options) harden browser defense.',
      mitigation: 'OWASP Protection: Security Misconfiguration',
    },
  ];

  return (
    <div className="container py-5">
      {/* Hero Section */}
      <div className="row justify-content-center text-center my-5">
        <div className="col-lg-10">
          <div className="badge-cyber px-3 py-2 mb-4 d-inline-flex align-items-center gap-2">
            <span className="spinner-grow spinner-grow-sm text-info" role="status"></span>
            <span>SECURE DEMO ENVIRONMENT COMPLIANT</span>
          </div>
          
          <h1 className="display-4 fw-extrabold text-white mb-3">
            Secure Web <span className="text-cyber-accent">Application Demo</span>
          </h1>
          
          <p className="lead text-muted mb-4 mx-auto" style={{ maxWidth: '750px' }}>
            Learn modern web security practices with Python Flask, SQLAlchemy, JWT Tokens, and React.
            Explore defense-in-depth implementations against the OWASP Top 10 vulnerabilities.
          </p>
          
          <div className="d-flex justify-content-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-cyber py-3 px-4">
                Go to Dashboard <i className="bi bi-arrow-right-short ms-1"></i>
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-cyber py-3 px-4">
                  Sign In <i className="bi bi-box-arrow-in-right ms-1"></i>
                </Link>
                <Link to="/register" className="btn btn-cyber-outline py-3 px-4">
                  Create Account <i className="bi bi-person-plus ms-1"></i>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <hr className="border-secondary border-opacity-25 my-5" />

      {/* Feature Cards Grid */}
      <div className="my-5">
        <h2 className="text-center text-white mb-5 font-monospace">Core Security Implementations</h2>
        
        <div className="row g-4">
          {features.map((feature, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card glass-card h-100">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center justify-content-center bg-dark border border-secondary text-cyber-accent rounded-3 mb-4" style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                      <i className={`bi ${feature.icon}`}></i>
                    </div>
                    <h4 className="card-title text-light mb-3">{feature.title}</h4>
                    <p className="card-text text-muted small">{feature.description}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-top border-secondary border-opacity-25">
                    <span className="badge bg-dark border border-secondary text-info font-monospace small">
                      {feature.mitigation}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
