/**
 * =============================================================================
 * Navbar Component
 * =============================================================================
 * Responsive navigation bar reflecting current authentication state.
 * =============================================================================
 */

import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const Navbar = ({ onShowLogoutConfirm }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-cyber sticky-top py-3">
      <div className="container">
        {/* Brand Link */}
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <span style={{ fontSize: '1.4rem' }}>🔒</span>
          <span className="text-cyber-accent">Secure Web Application</span>
        </Link>

        {/* Responsive Toggle Button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Items */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-2">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>
                <i className="bi bi-house-door me-1"></i> Home
              </NavLink>
            </li>
            
            {isAuthenticated && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/dashboard">
                    <i className="bi bi-speedometer2 me-1"></i> Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/profile">
                    <i className="bi bi-person me-1"></i> Profile
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/security">
                    <i className="bi bi-shield-check me-1"></i> Security Center
                  </NavLink>
                </li>
                {user?.role === 'admin' && (
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/admin">
                      <i className="bi bi-terminal-fill me-1 text-danger"></i> Admin Panel
                    </NavLink>
                  </li>
                )}
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-3">
                <div className="d-none d-md-flex flex-column align-items-end">
                  <span className="fw-semibold text-light small">{user?.name}</span>
                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>{user?.email}</span>
                </div>
                <Avatar name={user?.name} size={38} />
                <button
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={onShowLogoutConfirm}
                >
                  <i className="bi bi-box-arrow-right"></i> Logout
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-cyber-outline btn-sm">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Login
                </Link>
                <Link to="/register" className="btn btn-cyber btn-sm">
                  <i className="bi bi-person-plus me-1"></i> Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
