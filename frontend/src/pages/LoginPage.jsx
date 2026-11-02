/**
 * =============================================================================
 * LoginPage Component
 * =============================================================================
 * SECURITY FEATURES:
 *   - Local login form with CSRF-aware API communication.
 *   - Server-side and client-side credential verification.
 *   - Secure session handling mapping to remember-me checkbox choice.
 *   - Auto-redirection back to previously visited path.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validators';
import PasswordInput from '../components/PasswordInput';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get requested landing path, default to dashboard
  const destination = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear errors on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setFormError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      const emailError = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: emailError }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Pre-validate email
    const emailError = validateEmail(formData.email);
    const passwordError = formData.password ? '' : 'Password is required.';

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password, formData.rememberMe);

    if (result.success) {
      showToast('Welcome back! Authentication successful.', 'success');
      navigate(destination, { replace: true });
    } else {
      setFormError(result.error);
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center my-5">
        <div className="col-md-8 col-lg-5">
          <div className="card glass-card p-4">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="display-6 text-cyber-accent mb-2">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h3 className="card-title text-white fw-bold">Secure Access Portal</h3>
                <p className="text-muted small">Enter your credentials to verify identity</p>
              </div>

              {formError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-3" role="alert">
                  <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                  <div className="font-monospace small">{formError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Email Input */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label text-muted small fw-semibold">
                    Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-dark border-secondary border-end-0 text-muted">
                      <i className="bi bi-envelope-fill"></i>
                    </span>
                    <input
                      type="email"
                      className={`form-control glass-input border-start-0 ${errors.email ? 'is-invalid border-danger' : 'border-secondary'}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>
                </div>

                {/* Password Input (Reusable Component with Visibility Toggle) */}
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />

                {/* Remember Me Toggle */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input bg-dark border-secondary"
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <label className="form-check-label text-muted small" htmlFor="rememberMe">
                      Remember Me
                    </label>
                  </div>
                  
                  <span className="text-muted small font-monospace" style={{ fontSize: '0.7rem' }}>
                    SESSION SECURITY ACTIVE
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-cyber w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-unlock-fill"></i>
                      <span>Decrypt & Authorize</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4 pt-3 border-top border-secondary border-opacity-25">
                <p className="text-muted small mb-0">
                  New to the application?{' '}
                  <Link to="/register" className="text-cyber-accent text-decoration-none">
                    Register securely
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
