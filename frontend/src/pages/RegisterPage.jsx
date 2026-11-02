/**
 * =============================================================================
 * RegisterPage Component
 * =============================================================================
 * SECURITY FEATURES:
 *   - Live Password Strength Meter giving real-time score feedback to the user.
 *   - Client-side and server-side matching password policy.
 *   - Complete form fields validation preventing duplicate/malformed inputs.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  validateEmail, 
  validatePassword, 
  validateName,
  getPasswordStrength,
  getStrengthLabel 
} from '../utils/validators';
import PasswordInput from '../components/PasswordInput';

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Recalculate password strength dynamically
  useEffect(() => {
    setStrength(getPasswordStrength(formData.password));
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear errors when fields are edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setFormError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let fieldError = '';

    if (name === 'name') fieldError = validateName(value);
    if (name === 'email') fieldError = validateEmail(value);
    if (name === 'password') fieldError = validatePassword(value);
    if (name === 'confirmPassword') {
      fieldError = value === formData.password ? '' : 'Passwords do not match.';
    }

    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Run all validations
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password);
    const confErr = formData.password === formData.confirmPassword ? '' : 'Passwords do not match.';

    if (nameErr || emailErr || passErr || confErr) {
      setErrors({
        name: nameErr,
        email: emailErr,
        password: passErr,
        confirmPassword: confErr,
      });
      showToast('Please fix the errors in the form.', 'error');
      return;
    }

    setLoading(true);
    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.confirmPassword
    );

    if (result.success) {
      showToast('Registration successful! Session authorized.', 'success');
      navigate('/dashboard', { replace: true });
    } else {
      setFormError(result.error);
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const strengthDetails = getStrengthLabel(strength);

  return (
    <div className="container py-5">
      <div className="row justify-content-center my-5">
        <div className="col-md-9 col-lg-6">
          <div className="card glass-card p-4">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="display-6 text-cyber-accent mb-2">
                  <i className="bi bi-person-badge-fill"></i>
                </div>
                <h3 className="card-title text-white fw-bold">Enrollment Center</h3>
                <p className="text-muted small">Register a secure profile on this system</p>
              </div>

              {formError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-3" role="alert">
                  <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                  <div className="font-monospace small">{formError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div className="mb-3">
                  <label htmlFor="name" className="form-label text-muted small fw-semibold">
                    Full Name
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-dark border-secondary border-end-0 text-muted">
                      <i className="bi bi-person-fill"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control glass-input border-start-0 ${errors.name ? 'is-invalid border-danger' : 'border-secondary'}`}
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="John Doe"
                      required
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>
                </div>

                {/* Email Address */}
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
                      placeholder="john.doe@company.com"
                      autoComplete="email"
                      required
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>
                </div>

                {/* Password Input (Custom Component) */}
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.password}
                  placeholder="Create strong password"
                  autoComplete="new-password"
                  required
                />

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted small">Strength:</span>
                      <span className={`text-${strengthDetails.color} font-monospace small fw-bold`}>
                        {strengthDetails.label}
                      </span>
                    </div>
                    <div className="progress bg-dark" style={{ height: '6px' }}>
                      <div
                        className={`progress-bar bg-${strengthDetails.color}`}
                        role="progressbar"
                        style={{ width: `${(strength / 4) * 100}%` }}
                        aria-valuenow={strength}
                        aria-valuemin="0"
                        aria-valuemax="4"
                      ></div>
                    </div>
                    <div className="text-muted small mt-2 font-monospace" style={{ fontSize: '0.7rem' }}>
                      Requires: 8+ chars, Uppercase, Lowercase, Number, Special char.
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.confirmPassword}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-cyber w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Enrolling Profile...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-plus"></i>
                      <span>Create Account & Log In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4 pt-3 border-top border-secondary border-opacity-25">
                <p className="text-muted small mb-0">
                  Already registered?{' '}
                  <Link to="/login" className="text-cyber-accent text-decoration-none">
                    Log in securely
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

export default RegisterPage;
