/**
 * =============================================================================
 * PasswordInput Component
 * =============================================================================
 * SECURITY FEATURES:
 *   - Password visibility toggle (eye icon) to prevent password leakage
 *     while allowing verification of what is typed.
 *   - Auto-complete parameters set to generic or secure values.
 * =============================================================================
 */

import React, { useState } from 'react';

const PasswordInput = ({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="form-label text-muted small fw-semibold">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="input-group">
        <span className="input-group-text bg-dark border-secondary border-end-0 text-muted">
          <i className="bi bi-key-fill"></i>
        </span>
        <input
          type={showPassword ? 'text' : 'password'}
          className={`form-control glass-input border-start-0 border-end-0 ${error ? 'is-invalid border-danger' : 'border-secondary'}`}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          className="btn btn-outline-secondary border-start-0 text-muted"
          type="button"
          onClick={togglePasswordVisibility}
          style={{ background: 'rgba(17, 24, 39, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-cyber-accent`}></i>
        </button>
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    </div>
  );
};

export default PasswordInput;
