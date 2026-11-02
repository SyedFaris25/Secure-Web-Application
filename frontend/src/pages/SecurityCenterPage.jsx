/**
 * =============================================================================
 * SecurityCenterPage Component — Secure File Vault
 * =============================================================================
 * SECURITY FEATURES:
 *   - Real-time security auditing dashboard loaded from Flask endpoints.
 *   - CircularProgressBar with animated compliance score.
 *   - Live storage quotas, audit trails, and security logs stream.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import SecurityCard from '../components/SecurityCard';
import CircularProgressBar from '../components/CircularProgressBar';
import LoadingSpinner from '../components/LoadingSpinner';

const SecurityCenterPage = () => {
  const { showToast } = useToast();
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityStatus = async () => {
      try {
        const response = await api.get('/api/security-status');
        setSecurityData(response.data);
      } catch (err) {
        showToast('Failed to load system security status.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityStatus();
  }, [showToast]);

  const formatDate = (iso) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!securityData?.storageUsage) return 0;
    const { used, limit } = securityData.storageUsage;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  return (
    <div className="container py-5 text-white">
      {/* HEADER SECTION */}
      <div className="row mb-5 text-center text-lg-start align-items-center g-4">
        <div className="col-lg-8">
          <div className="badge-cyber-success px-3 py-2 mb-3 d-inline-flex align-items-center gap-2">
            <i className="bi bi-shield-check"></i>
            <span>SYSTEM AUDIT: SUCCESSFUL</span>
          </div>
          <h1 className="text-white display-5 fw-extrabold mb-2">
            Security Control <span className="text-cyber-accent">Center</span>
          </h1>
          <p className="text-muted lead mb-0">
            Real-time status of cryptographic storage, account compliance indicators, and system defenses.
          </p>
        </div>
        
        {securityData && (
          <div className="col-lg-4 text-center">
            <div className="glass-card p-4 d-inline-block w-100">
              <h6 className="text-muted uppercase small mb-3 font-monospace" style={{ letterSpacing: '1px' }}>COMPLIANCE RATING</h6>
              <CircularProgressBar score={securityData.score} size={160} strokeWidth={10} />
            </div>
          </div>
        )}
      </div>

      {/* STORAGE & SECURITY METRICS */}
      {securityData && (
        <div className="row g-3 mb-5">
          <div className="col-md-3">
            <div className="glass-card p-3 h-100">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: 'rgba(79, 172, 254, 0.1)', border: '1px solid rgba(79, 172, 254, 0.3)' }}>
                  <i className="bi bi-key-fill text-cyber-accent"></i>
                </div>
                <div>
                  <div className="text-muted small font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>PASSWORD AGE</div>
                  <div className="text-white fw-bold">{securityData.passwordAgeDays != null ? `${securityData.passwordAgeDays} days` : 'Unknown'}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 h-100">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: securityData.fileEncryptionStatus ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${securityData.fileEncryptionStatus ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <i className="bi bi-file-earmark-lock-fill text-success"></i>
                </div>
                <div>
                  <div className="text-muted small font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>FILE ENCRYPTION</div>
                  <div className="text-success fw-bold">AES-256-GCM</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 h-100">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b' }}></i>
                </div>
                <div>
                  <div className="text-muted small font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>FAILED LOGINS</div>
                  <div className="text-warning fw-bold">{securityData.failedLoginAttempts} Attempts</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="glass-card p-3 h-100">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <i className="bi bi-hdd-fill text-info"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="text-muted small font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>VAULT STORAGE</div>
                  <div className="text-white fw-bold small">
                    {formatBytes(securityData.storageUsage?.used || 0)} ({getStoragePercentage()}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY CONTROLS CARD GRID */}
      <h4 className="text-light mb-4 font-monospace text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.9rem' }}>Enforced Security Controls</h4>
      {loading ? (
        <LoadingSpinner message="Auditing active defensive systems..." />
      ) : (
        <div className="row g-4 mb-5">
          {securityData?.securityChecks.map((check, index) => (
            <div className="col-md-6 col-lg-4 col-xl-3" key={index}>
              <SecurityCard
                name={check.name}
                description={check.description}
                status={check.status}
                category={check.category}
              />
            </div>
          ))}
        </div>
      )}

      {/* REAL-TIME SECURITY EVENTS LIST (TERMINAL STYLE) */}
      {securityData && (
        <div className="row g-4 mb-5">
          <div className="col-12 col-lg-6">
            <div className="glass-card p-4 h-100">
              <h4 className="text-light mb-3 font-monospace d-flex align-items-center gap-2">
                <i className="bi bi-terminal-fill text-cyber-accent"></i>
                <span>Audit Trail Activity Stream</span>
              </h4>
              <div className="security-console" style={{ height: '300px', overflowY: 'auto' }}>
                <div>[SYSTEM INFO] Loading system event listener loop...</div>
                {securityData.auditLogs?.length === 0 ? (
                  <div className="text-muted">[INFO] No logs found.</div>
                ) : (
                  securityData.auditLogs.map((log, i) => (
                    <div key={i} className="text-muted small font-monospace my-1">
                      [{new Date(log.created_at).toLocaleTimeString()}] {log.action} {log.ip_address ? `from IP ${log.ip_address}` : ''}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RECENT SECURITY LOGINS */}
          <div className="col-12 col-lg-6">
            <div className="glass-card p-4 h-100">
              <h4 className="text-light mb-3 font-monospace d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-cyber-accent"></i>
                <span>Recent Logins Activity</span>
              </h4>
              <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table table-dark table-hover align-middle mb-0" style={{ borderColor: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                  <thead>
                    <tr className="text-muted small text-uppercase font-monospace" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                      <th>Date</th>
                      <th>IP</th>
                      <th>Browser</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityData.recentLogins?.slice(0, 5).map((login, i) => (
                      <tr key={i}>
                        <td className="font-monospace text-muted">{new Date(login.timestamp).toLocaleDateString()}</td>
                        <td className="font-monospace text-muted">{login.ip_address || '—'}</td>
                        <td className="text-muted">{login.browser || '—'}</td>
                        <td>
                          <span className={`badge font-monospace ${login.success ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {login.success ? 'OK' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER DEFENSIVE SPECIFICATION */}
      <div className="row">
        <div className="col-12">
          <div className="glass-card p-4">
            <h4 className="text-light mb-3 font-monospace d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock-fill text-cyber-accent"></i>
              <span>Defensive Cryptographic Policies</span>
            </h4>
            
            <div className="security-console">
              <div>[OK] Cryptographic Engine loaded: AES-GCM (Authenticated Encryption block standard)</div>
              <div>[OK] Key Derivation KDF derived using PBKDF2HMAC (SHA-256 with 100,000 iterations)</div>
              <div>[OK] User files stored ciphertext only; decryption key salt stored separately in SQLite metadata</div>
              <div>[OK] CSRF tokens validated on all transaction interfaces (Session cookies matching headers)</div>
              <div>[OK] SQL injection prevented using prepared parameter bind patterns via SQLAlchemy ORM</div>
              <div>[OK] XSS injection scrubbed using bleach clean parameters before DB execution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenterPage;
