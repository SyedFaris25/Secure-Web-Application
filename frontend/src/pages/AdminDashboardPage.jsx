/**
 * =============================================================================
 * AdminDashboardPage Component — Secure File Vault Admin
 * =============================================================================
 * SECURITY: Role-guarded administrative console with:
 *   - Users management (enable/disable accounts, change RBAC roles, delete profiles)
 *   - File auditing explorer (view all files on disk, check sizes, delete any file)
 *   - paginated Audit Logs mapping trace events
 *   - Storage statistics and server logs search
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import Avatar from '../components/Avatar';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // --- Active Tab ---
  // Tabs: 'users', 'files', 'logs'
  const [activeTab, setActiveTab] = useState('users');

  // --- Statistics ---
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- Users Tab ---
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersStatusFilter, setUsersStatusFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  // --- Files Tab ---
  const [files, setFiles] = useState([]);
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);
  const [filesTotal, setFilesTotal] = useState(0);
  const [filesSearch, setFilesSearch] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);

  // --- Audit Logs Tab ---
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsActionFilter, setLogsActionFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(true);

  // --- Confirm Dialog ---
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, isDangerous: false });

  // Fetch admin statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/statistics');
      setStats(res.data);
    } catch (err) {
      showToast('Failed to load administrative statistics.', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = { page: usersPage, per_page: 10 };
      if (usersSearch) params.search = usersSearch;
      if (usersRoleFilter) params.role = usersRoleFilter;
      if (usersStatusFilter) params.status = usersStatusFilter;
      const res = await api.get('/api/admin/users', { params });
      setUsers(res.data.users);
      setUsersTotalPages(res.data.pages);
      setUsersTotal(res.data.total);
    } catch (err) {
      showToast('Failed to load user list.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, usersSearch, usersRoleFilter, usersStatusFilter, showToast]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const params = { page: filesPage, per_page: 10 };
      if (filesSearch) params.search = filesSearch;
      const res = await api.get('/api/admin/files', { params });
      setFiles(res.data.files);
      setFilesTotalPages(res.data.pages);
      setFilesTotal(res.data.total);
    } catch (err) {
      showToast('Failed to load file list.', 'error');
    } finally {
      setLoadingFiles(false);
    }
  }, [filesPage, filesSearch, showToast]);

  useEffect(() => {
    if (activeTab === 'files') fetchFiles();
  }, [activeTab, fetchFiles]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = { page: logsPage, per_page: 10 };
      if (logsSearch) params.search = logsSearch;
      if (logsActionFilter) params.action = logsActionFilter;
      const res = await api.get('/api/admin/logs', { params });
      setLogs(res.data.logs);
      setLogsTotalPages(res.data.pages);
      setLogsTotal(res.data.total);
    } catch (err) {
      showToast('Failed to load audit logs.', 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [logsPage, logsSearch, logsActionFilter, showToast]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);

  // --- Administrative Handlers ---
  const handleChangeRole = (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setConfirmDialog({
      show: true,
      title: 'Change User Role',
      message: `Are you sure you want to change ${targetUser.name}'s role to "${newRole}"?`,
      isDangerous: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await api.put('/api/admin/change-role', { userId: targetUser.id, role: newRole });
          showToast(`Role updated to ${newRole} for ${targetUser.email}.`, 'success');
          fetchUsers();
          fetchStats();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to change role.', 'error');
        }
      }
    });
  };

  const handleToggleActive = (targetUser) => {
    const label = targetUser.is_active ? 'Deactivate' : 'Activate';
    setConfirmDialog({
      show: true,
      title: `${label} Account`,
      message: `Are you sure you want to ${label.toLowerCase()} ${targetUser.name}'s account?`,
      isDangerous: targetUser.is_active,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await api.post(`/api/admin/users/${targetUser.id}/toggle-active`);
          showToast(`Account ${label.toLowerCase()}d successfully.`, 'success');
          fetchUsers();
          fetchStats();
        } catch (err) {
          showToast(err.response?.data?.error || `Failed to ${label.toLowerCase()} account.`, 'error');
        }
      }
    });
  };

  const handleDeleteUser = (targetUser) => {
    setConfirmDialog({
      show: true,
      title: 'Delete User Permanently',
      message: `This action will permanently delete ${targetUser.name} (${targetUser.email}). All their folders and files will be lost forever.`,
      isDangerous: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await api.delete('/api/admin/delete-user', { data: { userId: targetUser.id } });
          showToast(`User ${targetUser.email} has been deleted.`, 'success');
          fetchUsers();
          fetchStats();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to delete user.', 'error');
        }
      }
    });
  };

  const handleDeleteFile = (targetFile) => {
    setConfirmDialog({
      show: true,
      title: 'Force Purge File',
      message: `Are you sure you want to administratively delete file '${targetFile.original_name}' belonging to ${targetFile.owner_email}?`,
      isDangerous: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await api.delete(`/api/admin/files/${targetFile.id}`);
          showToast(`File '${targetFile.original_name}' permanently purged from storage.`, 'success');
          fetchFiles();
          fetchStats();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to delete file.', 'error');
        }
      }
    });
  };

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: 'bi-people-fill', color: '#4facfe' },
    { label: 'Total Files', value: stats.totalFiles || 0, icon: 'bi-file-earmark-lock-fill', color: '#f59e0b' },
    { label: 'Total Folders', value: stats.totalFolders || 0, icon: 'bi-folder-fill', color: '#10b981' },
    { label: 'Total Storage Used', value: formatBytes(stats.totalStorageUsed || 0), icon: 'bi-hdd-fill', color: '#8b5cf6' },
    { label: 'Failed Logins', value: stats.failedLoginAttempts, icon: 'bi-shield-exclamation', color: '#ef4444' },
  ] : [];

  return (
    <div className="container py-5 text-white">
      {/* Header */}
      <div className="mb-5">
        <div className="badge bg-dark border border-danger text-danger px-3 py-2 mb-3 d-inline-flex align-items-center gap-2 font-monospace">
          <i className="bi bi-terminal-fill"></i> ADMIN CONTROL PANEL
        </div>
        <h1 className="text-white display-5 fw-bold">
          Vault <span className="text-cyber-accent">Administration</span>
        </h1>
        <p className="text-muted">Oversee security parameters, audit disk utilization, and manage user identity access.</p>
      </div>

      {/* Statistics Cards */}
      {loadingStats ? (
        <LoadingSpinner message="Querying storage stats..." />
      ) : (
        <div className="row g-3 mb-5">
          {statCards.map((card, i) => (
            <div className="col-6 col-md-4 col-xl" key={i}>
              <div className="glass-card p-3 h-100 text-center">
                <i className={`bi ${card.icon} fs-3 d-block mb-2`} style={{ color: card.color }}></i>
                <div className="fs-4 fw-bold font-monospace text-white mb-1">{card.value}</div>
                <div className="text-muted small font-monospace text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button className={`nav-link btn-sm ${activeTab === 'users' ? 'active bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('users')}>
            <i className="bi bi-people me-1"></i> Users List ({usersTotal})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link btn-sm ${activeTab === 'files' ? 'active bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('files')}>
            <i className="bi bi-file-earmark-lock-fill me-1"></i> Storage Files ({filesTotal})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link btn-sm ${activeTab === 'logs' ? 'active bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('logs')}>
            <i className="bi bi-journal-text me-1"></i> Audit Trails ({logsTotal})
          </button>
        </li>
      </ul>

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
            <h4 className="text-white mb-0 font-monospace" style={{ fontSize: '1rem' }}><i className="bi bi-people-fill text-cyber-accent me-2"></i>User Directory</h4>
            <div className="d-flex flex-wrap gap-2">
              <input
                type="text"
                className="form-control glass-input form-control-sm"
                placeholder="Search name/email..."
                value={usersSearch}
                onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                style={{ maxWidth: '200px' }}
              />
              <select className="form-select glass-input form-select-sm" value={usersRoleFilter} onChange={(e) => { setUsersRoleFilter(e.target.value); setUsersPage(1); }} style={{ maxWidth: '120px' }}>
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select className="form-select glass-input form-select-sm" value={usersStatusFilter} onChange={(e) => { setUsersStatusFilter(e.target.value); setUsersPage(1); }} style={{ maxWidth: '130px' }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <LoadingSpinner message="Loading users list..." />
          ) : users.length === 0 ? (
            <div className="text-center text-muted py-5">No user records match the filter query.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0" style={{ borderColor: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                <thead>
                  <tr className="text-muted small text-uppercase font-monospace" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                    <th>Display Name</th>
                    <th>Email Address</th>
                    <th>Access Level</th>
                    <th>Account Status</th>
                    <th>Registration Date</th>
                    <th className="text-end">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar name={u.name} size={32} />
                          <span className="text-light">{u.name}</span>
                        </div>
                      </td>
                      <td className="font-monospace small text-muted">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-dark border border-info text-info'} font-monospace`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-cyber-success' : 'bg-dark border border-danger text-danger'} font-monospace`}>
                          {u.is_active ? '● ACTIVE' : '○ DEACTIVATED'}
                        </span>
                      </td>
                      <td className="text-muted small">{formatDate(u.created_at)}</td>
                      <td>
                        <div className="d-flex justify-content-end gap-1">
                          {u.id !== user?.id && (
                            <>
                              <button className="btn btn-sm btn-outline-info py-1 px-2" title="Toggle Access Level" onClick={() => handleChangeRole(u)}>
                                <i className="bi bi-arrow-repeat"></i>
                              </button>
                              <button className={`btn btn-sm ${u.is_active ? 'btn-outline-warning' : 'btn-outline-success'} py-1 px-2`} title={u.is_active ? 'Disable' : 'Enable'} onClick={() => handleToggleActive(u)}>
                                <i className={`bi ${u.is_active ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger py-1 px-2" title="Delete User" onClick={() => handleDeleteUser(u)}>
                                <i className="bi bi-trash3"></i>
                              </button>
                            </>
                          )}
                          {u.id === user?.id && (
                            <span className="badge bg-dark text-muted font-monospace small px-2 py-1">YOU</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {usersTotalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${usersPage <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setUsersPage(p => Math.max(1, p - 1))}>‹</button>
                </li>
                {Array.from({ length: usersTotalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === usersPage ? 'active' : ''}`}>
                    <button className={`page-link ${p === usersPage ? 'bg-info text-dark border-info' : 'bg-dark border-secondary text-light'}`} onClick={() => setUsersPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${usersPage >= usersTotalPages ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}>›</button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}

      {/* ===== FILES TAB ===== */}
      {activeTab === 'files' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
            <h4 className="text-white mb-0 font-monospace" style={{ fontSize: '1rem' }}><i className="bi bi-file-earmark-lock-fill text-cyber-accent me-2"></i>Global File Audit Ledger</h4>
            <input
              type="text"
              className="form-control glass-input form-control-sm"
              placeholder="Search file name or user email..."
              value={filesSearch}
              onChange={(e) => { setFilesSearch(e.target.value); setFilesPage(1); }}
              style={{ maxWidth: '250px' }}
            />
          </div>

          {loadingFiles ? (
            <LoadingSpinner message="Auditing files registry..." />
          ) : files.length === 0 ? (
            <div className="text-center text-muted py-5">No files found on server matching the search criteria.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0" style={{ borderColor: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                <thead>
                  <tr className="text-muted small text-uppercase font-monospace" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                    <th>File Name</th>
                    <th>File Owner</th>
                    <th>Size</th>
                    <th>Disk Storage Block</th>
                    <th>Upload Timestamp</th>
                    <th className="text-end">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-file-earmark-lock text-warning"></i>
                          <span className="text-light text-truncate" style={{ maxWidth: '250px' }}>{f.original_name}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="text-light small">{f.owner_name}</div>
                          <div className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>{f.owner_email}</div>
                        </div>
                      </td>
                      <td className="font-monospace text-muted small">{formatBytes(f.size)}</td>
                      <td className="font-monospace text-muted small text-truncate" style={{ maxWidth: '180px' }}>{f.filename}</td>
                      <td className="text-muted small">{formatDate(f.upload_time)}</td>
                      <td>
                        <div className="d-flex justify-content-end">
                          <button className="btn btn-sm btn-outline-danger py-1 px-2" title="Force Purge File" onClick={() => handleDeleteFile(f)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filesTotalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${filesPage <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setFilesPage(p => Math.max(1, p - 1))}>‹</button>
                </li>
                {Array.from({ length: filesTotalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === filesPage ? 'active' : ''}`}>
                    <button className={`page-link ${p === filesPage ? 'bg-info text-dark border-info' : 'bg-dark border-secondary text-light'}`} onClick={() => setFilesPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${filesPage >= filesTotalPages ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setFilesPage(p => Math.min(filesTotalPages, p + 1))}>›</button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}

      {/* ===== AUDIT LOGS TAB ===== */}
      {activeTab === 'logs' && (
        <div className="glass-card p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
            <h4 className="text-white mb-0 font-monospace" style={{ fontSize: '1rem' }}><i className="bi bi-journal-text text-cyber-accent me-2"></i>Security Logs Ledger</h4>
            <div className="d-flex flex-wrap gap-2">
              <input
                type="text"
                className="form-control glass-input form-control-sm"
                placeholder="Search user, IP, or log action..."
                value={logsSearch}
                onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1); }}
                style={{ maxWidth: '200px' }}
              />
              <select className="form-select glass-input form-select-sm" value={logsActionFilter} onChange={(e) => { setLogsActionFilter(e.target.value); setLogsPage(1); }} style={{ maxWidth: '180px' }}>
                <option value="">All Logs</option>
                <option value="ACCOUNT_CREATED">ACCOUNT_CREATED</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="UPLOAD">UPLOAD</option>
                <option value="DOWNLOAD">DOWNLOAD</option>
                <option value="DELETE">DELETE</option>
                <option value="FOLDER_CREATE">FOLDER_CREATE</option>
                <option value="FOLDER_DELETE">FOLDER_DELETE</option>
                <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
                <option value="PROFILE_UPDATED">PROFILE_UPDATED</option>
              </select>
            </div>
          </div>

          {loadingLogs ? (
            <LoadingSpinner message="Fetching logs..." />
          ) : logs.length === 0 ? (
            <div className="text-center text-muted py-5">No logs recorded.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0" style={{ borderColor: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                <thead>
                  <tr className="text-muted small text-uppercase font-monospace" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                    <th>Timestamp</th>
                    <th>User Identity</th>
                    <th>Audit Action Details</th>
                    <th>IP Origin</th>
                    <th>Client Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="font-monospace small text-muted">{formatDate(log.created_at)}</td>
                      <td>
                        <div>
                          <span className="text-light">{log.user_name}</span>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{log.user_email}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge font-monospace px-2 py-1 ${
                          log.action.includes('FAIL') || log.action.includes('DELETE') ? 'bg-danger' :
                          log.action.includes('SUCCESS') || log.action.includes('CREATED') || log.action.includes('UPLOAD') ? 'bg-success' :
                          'bg-dark border border-secondary text-info'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="font-monospace small text-muted">{log.ip_address || '—'}</td>
                      <td className="text-muted small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.browser || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {logsTotalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${logsPage <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setLogsPage(p => Math.max(1, p - 1))}>‹</button>
                </li>
                {Array.from({ length: logsTotalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === logsPage ? 'active' : ''}`}>
                    <button className={`page-link ${p === logsPage ? 'bg-info text-dark border-info' : 'bg-dark border-secondary text-light'}`} onClick={() => setLogsPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${logsPage >= logsTotalPages ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}>›</button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Execute"
        cancelText="Cancel"
        isDangerous={confirmDialog.isDangerous}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
};

export default AdminDashboardPage;
