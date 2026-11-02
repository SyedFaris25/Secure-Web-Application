/**
 * =============================================================================
 * ProfilePage Component — Secure File Vault
 * =============================================================================
 * SECURITY: User identity verification and secure metadata audits.
 * Renders user statistics: avatar, storage space metrics, audit trail logs,
 * creation dates, and security score from Flask backend APIs.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validateName } from '../utils/validators';
import Avatar from '../components/Avatar';
import PasswordInput from '../components/PasswordInput';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';

const ProfilePage = () => {
  const { user, updateUserData, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- Profile states ---
  const [profile, setProfile] = useState(null);
  const [securityScore, setSecurityScore] = useState(0);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalFolders: 0,
    usedStorage: 0,
    limitStorage: 100 * 1024 * 1024,
  });
  
  // Loading & Error states
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [purgingAccount, setPurgingAccount] = useState(false);

  // Edit form states
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [editErrors, setEditErrors] = useState({ name: '', email: '' });

  // Password form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Danger zone confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Fetch both profile details and security metrics
  const fetchProfileData = async () => {
    setLoadingData(true);
    setErrorMsg('');
    try {
      const [profileRes, securityRes] = await Promise.all([
        api.get('/api/profile'),
        api.get('/api/security-status')
      ]);

      const fetchedUser = profileRes.data.user;
      setProfile(fetchedUser);
      setEditForm({
        name: fetchedUser.name || '',
        email: fetchedUser.email || '',
      });

      setSecurityScore(securityRes.data.score || 0);
      setStats({
        totalFiles: securityRes.data.totalFiles || 0,
        totalFolders: securityRes.data.totalFolders || 0,
        usedStorage: securityRes.data.storageUsage?.used || 0,
        limitStorage: securityRes.data.storageUsage?.limit || (100 * 1024 * 1024),
      });
    } catch (err) {
      console.error('Failed to load profile metrics.', err);
      // If token expired (401), interceptor will handle redirect. Otherwise show error block.
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setErrorMsg(err.response?.data?.error || 'Failed to establish connection with secure APIs.');
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Form input handlers
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Edit validation & submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const nameErr = validateName(editForm.name);
    const emailErr = validateEmail(editForm.email);

    if (nameErr || emailErr) {
      setEditErrors({ name: nameErr, email: emailErr });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put('/api/profile', {
        name: editForm.name,
        email: editForm.email,
      });
      showToast(res.data.message || 'Profile settings synchronized.', 'success');
      updateUserData(res.data.user);
      fetchProfileData(); // Refresh info
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update credentials ledger.';
      showToast(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password validation & submit
  const validateNewPassword = (pwd) => {
    if (!pwd) return 'New password is required.';
    if (pwd.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(pwd)) return 'Password must contain at least one special character.';
    return '';
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    let valid = true;
    const errors = { currentPassword: '', newPassword: '', confirmPassword: '' };

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required.';
      valid = false;
    }

    const newPwdErr = validateNewPassword(passwordForm.newPassword);
    if (newPwdErr) {
      errors.newPassword = newPwdErr;
      valid = false;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
      valid = false;
    }

    if (!valid) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/api/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      showToast(res.data.message || 'Security keys rotated successfully.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to rotative key ledger.';
      showToast(msg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Account Purge handlers
  const handlePurgeSubmit = async (e) => {
    e.preventDefault();
    if (!deleteConfirmPassword) {
      setDeleteError('Cryptographic key signature required.');
      return;
    }

    setPurgingAccount(true);
    setDeleteError('');
    try {
      await api.delete('/api/profile', {
        data: { password: deleteConfirmPassword }
      });
      showToast('Vault account purged successfully. Terminating session.', 'info');
      setShowDeleteModal(false);
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Incorrect confirmation signature.');
    } finally {
      setPurgingAccount(false);
    }
  };

  // Helper formatting functions
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    return Math.min(100, Math.round((stats.usedStorage / stats.limitStorage) * 100));
  };

  const formatDate = (iso) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render Skeleton Loaders if loading
  if (loadingData) {
    return (
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-12 col-md-5">
            <div className="card glass-card p-4">
              <div className="d-flex flex-column align-items-center mb-4">
                <div className="bg-secondary rounded-circle mb-3 placeholder" style={{ width: '90px', height: '90px' }}></div>
                <div className="bg-secondary rounded placeholder w-50 mb-2" style={{ height: '24px' }}></div>
                <div className="bg-secondary rounded placeholder w-25" style={{ height: '16px' }}></div>
              </div>
              <div className="bg-secondary rounded placeholder w-100 mb-3" style={{ height: '12px' }}></div>
              <div className="bg-secondary rounded placeholder w-100 mb-3" style={{ height: '12px' }}></div>
              <div className="bg-secondary rounded placeholder w-100" style={{ height: '12px' }}></div>
            </div>
          </div>
          <div className="col-12 col-md-7">
            <div className="card glass-card p-4">
              <div className="bg-secondary rounded placeholder w-50 mb-4" style={{ height: '28px' }}></div>
              <div className="bg-secondary rounded placeholder w-100 mb-3" style={{ height: '40px' }}></div>
              <div className="bg-secondary rounded placeholder w-100 mb-3" style={{ height: '40px' }}></div>
              <div className="bg-secondary rounded placeholder w-100" style={{ height: '40px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Error Block if fetching fails
  if (errorMsg) {
    return (
      <div className="container py-5 text-center">
        <div className="row justify-content-center align-items-center my-5" style={{ minHeight: '50vh' }}>
          <div className="col-md-7">
            <div className="card glass-card p-5 border border-danger">
              <div className="display-4 text-danger mb-3">
                <i className="bi bi-shield-slash-fill"></i>
              </div>
              <h3 className="text-white mb-3">API Connectivity Fail</h3>
              <p className="text-muted mb-4">{errorMsg}</p>
              <button className="btn btn-cyber px-4 py-2" onClick={fetchProfileData}>
                <i className="bi bi-arrow-clockwise me-2"></i> Retry Vault Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card glass-card p-4 h-100">
            <div className="card-body text-center">
              <div className="mb-3 d-flex justify-content-center">
                <Avatar name={profile?.name} size={90} />
              </div>
              <h3 className="text-white fw-bold mb-1">{profile?.name}</h3>
              <span className={`badge ${profile?.role === 'admin' ? 'bg-danger' : 'bg-dark border border-info text-info'} font-monospace px-3 py-1.5 mb-4`}>
                {profile?.role?.toUpperCase()}
              </span>

              <div className="mb-4 text-start">
                <div className="d-flex justify-content-between text-muted small font-monospace mb-1" style={{ fontSize: '0.75rem' }}>
                  <span>VAULT SPACE UTILIZED</span>
                  <span>{getStoragePercentage()}%</span>
                </div>
                <div className="progress bg-dark mb-2" style={{ height: '8px' }}>
                  <div className="progress-bar bg-info" style={{ width: `${getStoragePercentage()}%` }}></div>
                </div>
                <div className="small font-monospace text-muted text-center" style={{ fontSize: '0.75rem' }}>
                  {formatBytes(stats.usedStorage)} / {formatBytes(stats.limitStorage)}
                </div>
              </div>

              <ul className="list-group list-group-flush bg-transparent text-start font-monospace text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                <li className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-0 py-2.5 d-flex justify-content-between">
                  <span>Vault Status</span>
                  <span className="text-success fw-bold">ACTIVE</span>
                </li>
                <li className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-0 py-2.5 d-flex justify-content-between">
                  <span>Files Uploaded</span>
                  <span className="text-white fw-bold">{stats.totalFiles}</span>
                </li>
                <li className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-0 py-2.5 d-flex justify-content-between">
                  <span>Folders Created</span>
                  <span className="text-white fw-bold">{stats.totalFolders}</span>
                </li>
                <li className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-0 py-2.5 d-flex justify-content-between">
                  <span>Compliance Score</span>
                  <span className="text-info fw-bold">{securityScore}% Compliant</span>
                </li>
                <li className="list-group-item bg-transparent text-light border-secondary border-opacity-25 px-0 py-2.5 d-flex justify-content-between">
                  <span>Joined Date</span>
                  <span className="text-white fw-bold">{formatDate(profile?.created_at).split(' at')[0]}</span>
                </li>
                <li className="list-group-item bg-transparent text-light border-bottom-0 px-0 py-2.5 d-flex justify-content-between">
                  <span>Last Login</span>
                  <span className="text-white fw-bold">{formatDate(profile?.last_login).split(' at')[0]}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card glass-card p-4 mb-4">
            <div className="card-body">
              <h4 className="text-white fw-bold mb-4 font-monospace"><i className="bi bi-person-gear text-cyber-accent me-2"></i>Profile Settings</h4>
              <form onSubmit={handleEditSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label text-muted small fw-semibold">Full Name</label>
                  <div className="input-group">
                    <span className="input-group-text bg-dark border-secondary border-end-0 text-muted">
                      <i className="bi bi-person-fill"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control glass-input border-start-0 ${editErrors.name ? 'is-invalid border-danger' : 'border-secondary'}`}
                      id="name"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.name && <div className="invalid-feedback">{editErrors.name}</div>}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="form-label text-muted small fw-semibold">Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-dark border-secondary border-end-0 text-muted">
                      <i className="bi bi-envelope-fill"></i>
                    </span>
                    <input
                      type="email"
                      className={`form-control glass-input border-start-0 ${editErrors.email ? 'is-invalid border-danger' : 'border-secondary'}`}
                      id="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.email && <div className="invalid-feedback">{editErrors.email}</div>}
                  </div>
                </div>

                <button type="submit" className="btn btn-cyber w-100 py-2 d-flex align-items-center justify-content-center gap-2" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Syncing Keys...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill"></i>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="card glass-card p-4 mb-4">
            <div className="card-body">
              <h4 className="text-white fw-bold mb-4 font-monospace"><i className="bi bi-shield-lock text-cyber-accent me-2"></i>Rotate Password Keys</h4>
              <form onSubmit={handlePasswordSubmit} noValidate>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.currentPassword}
                  required
                />
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.newPassword}
                  required
                />
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  error={passwordErrors.confirmPassword}
                  required
                />

                <button type="submit" className="btn btn-cyber w-100 py-2 d-flex align-items-center justify-content-center gap-2" disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Rotating Keys...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="card glass-card p-4 border border-danger border-opacity-25">
            <div className="card-body">
              <h4 className="text-danger fw-bold mb-2 font-monospace"><i className="bi bi-exclamation-triangle text-danger me-2"></i>Danger Zone</h4>
              <p className="text-muted small mb-4">
                Permanently purge this Vault user context. This action deletes all folders, audit logs, and encrypted files. It cannot be undone.
              </p>
              <button type="button" className="btn btn-outline-danger w-100 py-2 d-flex align-items-center justify-content-center gap-2" onClick={() => setShowDeleteModal(true)}>
                <i className="bi bi-trash3-fill"></i>
                <span>Purge Vault Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        show={showDeleteModal}
        title="CRITICAL SECURITY: PURGE ACCOUNT"
        message="Are you absolutely certain you wish to purge this account? This action is irreversibly destructive and all stored records will be destroyed."
        confirmText="Confirm Purge"
        cancelText="Cancel"
        onConfirm={() => {}} // Custom submit handled via form inside the dialog
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteConfirmPassword('');
          setDeleteError('');
        }}
        isDangerous={true}
      >
        <form onSubmit={handlePurgeSubmit} className="mt-3 text-start">
          <PasswordInput
            id="deleteConfirmPassword"
            name="deleteConfirmPassword"
            label="Provide Cryptographic Password Signature to Confirm Deletion:"
            value={deleteConfirmPassword}
            onChange={(e) => {
              setDeleteConfirmPassword(e.target.value);
              setDeleteError('');
            }}
            error={deleteError}
            required
          />
          <div className="d-flex gap-3 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary w-50"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmPassword('');
                setDeleteError('');
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger w-50 d-flex align-items-center justify-content-center gap-2"
              disabled={purgingAccount}
            >
              {purgingAccount ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Purging...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-trash3-fill"></i>
                  <span>Destroy Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </ConfirmDialog>
    </div>
  );
};

export default ProfilePage;
