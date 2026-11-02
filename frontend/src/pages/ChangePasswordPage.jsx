/**
 * =============================================================================
 * ChangePasswordPage Component
 * =============================================================================
 * SECURITY FEATURES:
 *   - JWT-authorized password updating.
 *   - Verification of current credentials before update.
 *   - Local password strength checks.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { 
  validatePassword, 
  getPasswordStrength, 
  getStrengthLabel 
} from '../utils/validators';
import PasswordInput from '../components/PasswordInput';
import api from '../api/axios';

const ChangePasswordPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Recalculate password strength dynamically
  useEffect(() => {
    setStrength(getPasswordStrength(formData.newPassword));
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setFormError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let fieldError = '';

    if (name === 'currentPassword') {
      fieldError = value ? '' : 'Current password is required.';
    }
    if (name === 'newPassword') {
      fieldError = validatePassword(value);
      if (!fieldError && value === formData.currentPassword) {
        fieldError = 'New password must be different from current password.';
      }
    }
    if (name === 'confirmPassword') {
      fieldError = value === formData.newPassword ? '' : 'Passwords do not match.';
    }

    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const currErr = formData.currentPassword ? '' : 'Current password is required.';
    const newErr = validatePassword(formData.newPassword);
    const diffErr = formData.newPassword && formData.newPassword === formData.currentPassword
      ? 'New password must be different from current password.'
      : '';
    const confErr = formData.newPassword === formData.confirmPassword ? '' : 'Passwords do not match.';

    if (currErr || newErr || diffErr || confErr) {
      setErrors({
        currentPassword: currErr,
        newPassword: newErr || diffErr,
        confirmPassword: confErr,
      });
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      showToast('Password changed successfully.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to change password.';
      setFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
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
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h3 className="card-title text-white fw-bold">Modify Password</h3>
                <p className="text-muted small">Update your encryption secret key credentials</p>
              </div>

              {formError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-3" role="alert">
                  <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                  <div className="font-monospace small">{formError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Current Password */}
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  label="Current Password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.currentPassword}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />

                {/* New Password */}
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  label="New Password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.newPassword}
                  placeholder="Create new strong password"
                  autoComplete="new-password"
                  required
                />

                {/* Strength meter */}
                {formData.newPassword && (
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
                  </div>
                )}

                {/* Confirm New Password */}
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.confirmPassword}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />

                {/* Submit buttons */}
                <div className="d-flex gap-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-cyber-outline w-50 py-2.5"
                    onClick={() => navigate('/dashboard')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-cyber w-50 py-2.5 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check"></i>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
