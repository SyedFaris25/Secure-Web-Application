/**
 * =============================================================================
 * DashboardPage Component — Secure File Vault
 * =============================================================================
 * Renders a Google Drive / Dropbox style workspace including:
 *   - Hierarchical folder navigation (folders breadcrumbs)
 *   - Drag-and-drop file upload target area with progress trackers
 *   - Quota storage status meter
 *   - Favorites list & recent files timeline
 *   - Move, Rename, Delete, and Image Preview modals
 * =============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';

const DashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- Views ---
  // View states: 'drive', 'favorites', 'recent'
  const [currentView, setCurrentView] = useState('drive');

  // --- Directory Navigation ---
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // [{id: null, name: 'My Drive'}, ...]

  // --- Data States ---
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [storage, setStorage] = useState({ used: 0, limit: 100 * 1024 * 1024 }); // 100MB
  const [loading, setLoading] = useState(true);

  // --- UI Interactions ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [sortField, setSortField] = useState('original_name'); // 'original_name', 'size', 'upload_time'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // --- Modals / Actions ---
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newName, setNewName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [destFolderId, setDestFolderId] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, target: null, type: '' });

  // --- Drag and Drop Upload ---
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // percent
  const fileInputRef = useRef(null);

  // --- Load Storage & Quota ---
  const fetchStorageStats = useCallback(async () => {
    try {
      const res = await api.get('/api/storage');
      setStorage(res.data);
    } catch (err) {
      console.error('Failed to load storage status.', err);
    }
  }, []);

  // --- Load Files & Folders ---
  const fetchDriveContents = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '/api/files';
      const params = {};
      
      if (currentView === 'favorites') {
        params.favorite = 'true';
      } else if (currentView === 'recent') {
        // Fetch from recent API instead
        const res = await api.get('/api/recent');
        setFiles(res.data.files);
        setFolders([]);
        setLoading(false);
        return;
      } else {
        params.folderId = currentFolderId;
      }

      const res = await api.get(endpoint, { params });
      setFiles(res.data.files);
      setFolders(res.data.folders);
    } catch (err) {
      showToast('Failed to fetch drive contents.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentView, currentFolderId, showToast]);

  // Load everything
  useEffect(() => {
    fetchStorageStats();
    fetchDriveContents();
  }, [currentView, currentFolderId, fetchDriveContents, fetchStorageStats]);

  // --- Search Execution ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery && !searchType) {
      fetchDriveContents();
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/api/search', {
        params: { q: searchQuery, type: searchType }
      });
      setFiles(res.data.files);
      setFolders(res.data.folders);
    } catch (err) {
      showToast('Search query execution failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Create Folder ---
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.post('/api/folder', {
        name: newFolderName.trim(),
        parentId: currentFolderId
      });
      showToast('Folder created successfully.', 'success');
      setNewFolderName('');
      setShowFolderModal(false);
      fetchDriveContents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create folder.', 'error');
    }
  };

  // --- Delete File / Folder ---
  const triggerDelete = (target, type) => {
    setConfirmDelete({ show: true, target, type });
  };

  const handleConfirmDelete = async () => {
    const { target, type } = confirmDelete;
    setConfirmDelete({ show: false, target: null, type: '' });
    try {
      if (type === 'file') {
        await api.delete(`/api/file/${target.id}`);
        showToast('File permanently deleted from vault.', 'info');
      } else if (type === 'folder') {
        await api.delete(`/api/folder/${target.id}`);
        showToast('Folder and all its contents recursively purged.', 'info');
      }
      fetchDriveContents();
      fetchStorageStats();
    } catch (err) {
      showToast('Delete operation failed.', 'error');
    }
  };

  // --- Rename File ---
  const triggerRename = (file) => {
    setSelectedFile(file);
    setNewName(file.original_name);
    setShowRenameModal(true);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !selectedFile) return;
    try {
      await api.put(`/api/file/${selectedFile.id}`, {
        original_name: newName.trim()
      });
      showToast('File renamed successfully.', 'success');
      setShowRenameModal(false);
      fetchDriveContents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to rename file.', 'error');
    }
  };

  // --- Toggle Favorite ---
  const handleToggleFavorite = async (file) => {
    try {
      await api.put(`/api/file/${file.id}`, {
        favorite: !file.favorite
      });
      showToast(file.favorite ? 'Removed from favorites.' : 'Added to favorites.', 'success');
      fetchDriveContents();
    } catch (err) {
      showToast('Failed to update favorite status.', 'error');
    }
  };

  // --- Move File ---
  const triggerMove = (file) => {
    setSelectedFile(file);
    setDestFolderId('');
    setShowMoveModal(true);
  };

  const handleMove = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      await api.put(`/api/file/${selectedFile.id}`, {
        folder_id: destFolderId === 'root' ? null : parseInt(destFolderId)
      });
      showToast('File relocated successfully.', 'success');
      setShowMoveModal(false);
      fetchDriveContents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to move file.', 'error');
    }
  };

  // --- File Upload Triggers ---
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    setUploadProgress(10);
    try {
      await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      showToast('File encrypted and uploaded successfully!', 'success');
      fetchDriveContents();
      fetchStorageStats();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // --- File Download ---
  const handleDownload = async (file) => {
    try {
      const res = await api.get(`/api/file/${file.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Download failed or unauthorized.', 'error');
    }
  };

  // --- Image Preview Modal ---
  const handlePreview = async (file) => {
    const imageExtensions = ['png', 'jpg', 'jpeg'];
    if (!imageExtensions.includes(file.file_type.toLowerCase())) {
      showToast('Preview is only available for images.', 'info');
      return;
    }
    try {
      const res = await api.get(`/api/file/${file.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      showToast('Failed to load image preview.', 'error');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  // --- Folder Traversal ---
  const navigateToFolder = (folder) => {
    if (currentView !== 'drive') {
      setCurrentView('drive');
    }
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, folder]);
  };

  const navigateToBreadcrumb = (index) => {
    if (currentView !== 'drive') {
      setCurrentView('drive');
    }
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const target = folderPath[index];
      setCurrentFolderId(target.id);
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  // --- Formatting Helpers ---
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    return Math.min(100, Math.round((storage.used / storage.limit) * 100));
  };

  const getFileIcon = (type) => {
    const t = type.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(t)) return 'bi-file-earmark-image text-warning';
    if (t === 'pdf') return 'bi-file-earmark-pdf text-danger';
    if (t === 'zip') return 'bi-file-earmark-zip text-info';
    if (t === 'docx') return 'bi-file-earmark-word text-primary';
    return 'bi-file-earmark-text text-secondary';
  };

  // --- Sorting Logic ---
  const sortedFiles = [...files].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="container-fluid py-4 min-vh-100 bg-cyber-dark text-white">
      <div className="row g-4">
        
        {/* ================= SIDEBAR ================= */}
        <div className="col-12 col-md-3 col-lg-2">
          <div className="glass-card p-3 mb-4 h-100">
            {/* User Bio */}
            <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom border-secondary border-opacity-25">
              <Avatar name={user?.name} size={38} />
              <div className="text-truncate">
                <div className="fw-bold small text-light text-truncate">{user?.name}</div>
                <div className="text-muted text-truncate font-monospace" style={{ fontSize: '0.65rem' }}>{user?.role?.toUpperCase()} SESSION</div>
              </div>
            </div>

            {/* Storage Utilization */}
            <div className="mb-4">
              <div className="d-flex justify-content-between text-muted small font-monospace mb-1" style={{ fontSize: '0.7rem' }}>
                <span>VAULT SPACE</span>
                <span>{getStoragePercentage()}%</span>
              </div>
              <div className="progress bg-dark mb-2" style={{ height: '6px' }}>
                <div className="progress-bar bg-info" style={{ width: `${getStoragePercentage()}%` }}></div>
              </div>
              <div className="small font-monospace text-muted" style={{ fontSize: '0.7rem' }}>
                {formatBytes(storage.used)} / {formatBytes(storage.limit)}
              </div>
            </div>

            {/* Sidebar Navigation */}
            <ul className="nav flex-column gap-2 mb-4">
              <li className="nav-item">
                <button className={`nav-link w-100 text-start btn btn-sm border-0 d-flex align-items-center gap-2 py-2 px-3 ${currentView === 'drive' ? 'bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => { setCurrentView('drive'); setCurrentFolderId(null); setFolderPath([]); }}>
                  <i className="bi bi-folder-fill"></i> My Drive
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link w-100 text-start btn btn-sm border-0 d-flex align-items-center gap-2 py-2 px-3 ${currentView === 'favorites' ? 'bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => setCurrentView('favorites')}>
                  <i className="bi bi-star-fill"></i> Favorites
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link w-100 text-start btn btn-sm btn-dark border-0 d-flex align-items-center gap-2 py-2 px-3 ${currentView === 'recent' ? 'bg-info text-dark fw-bold' : 'text-muted'}`} onClick={() => setCurrentView('recent')}>
                  <i className="bi bi-clock-history"></i> Recent Activity
                </button>
              </li>
              <li className="nav-item">
                <Link to="/security" className="nav-link w-100 text-start btn btn-sm border-0 d-flex align-items-center gap-2 py-2 px-3 text-muted">
                  <i className="bi bi-shield-check"></i> Security Center
                </Link>
              </li>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link w-100 text-start btn btn-sm border-0 d-flex align-items-center gap-2 py-2 px-3 text-danger fw-bold border border-danger border-opacity-25">
                    <i className="bi bi-terminal-fill"></i> Admin Panel
                  </Link>
                </li>
              )}
            </ul>

            {/* Quick Upload Button */}
            <button className="btn btn-cyber w-100 py-2 btn-sm mb-2" onClick={() => fileInputRef.current?.click()}>
              <i className="bi bi-cloud-upload-fill me-1"></i> Upload File
            </button>
            <input type="file" ref={fileInputRef} onChange={onFileSelect} style={{ display: 'none' }} />

            <button className="btn btn-cyber-outline w-100 py-2 btn-sm" onClick={() => setShowFolderModal(true)}>
              <i className="bi bi-folder-plus me-1"></i> Create Folder
            </button>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="col-12 col-md-9 col-lg-10">
          
          {/* Header Search & Filtering */}
          <div className="glass-card p-3 mb-4">
            <form onSubmit={handleSearch} className="row g-2 align-items-center">
              <div className="col-12 col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-muted"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control glass-input" placeholder="Search file, type, folder..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="col-6 col-md-3">
                <select className="form-select glass-input" value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                  <option value="">All File Types</option>
                  <option value="pdf">PDF Docs</option>
                  <option value="docx">Word Docs</option>
                  <option value="txt">Text Files</option>
                  <option value="png">PNG Images</option>
                  <option value="jpg">JPG Images</option>
                  <option value="zip">ZIP Archives</option>
                </select>
              </div>
              <div className="col-6 col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-info text-dark fw-bold w-100">Find Records</button>
                <button type="button" className="btn btn-outline-secondary text-white" onClick={() => { setSearchQuery(''); setSearchType(''); fetchDriveContents(); }}>Reset</button>
              </div>
            </form>
          </div>

          {/* Breadcrumbs Navigation */}
          {currentView === 'drive' && (
            <nav className="mb-4">
              <ol className="breadcrumb font-monospace small">
                <li className="breadcrumb-item">
                  <button className="btn btn-link text-cyber-accent text-decoration-none p-0 align-baseline" onClick={() => navigateToBreadcrumb(-1)}>My Drive</button>
                </li>
                {folderPath.map((f, index) => (
                  <li className="breadcrumb-item text-white active" key={f.id}>
                    {index === folderPath.length - 1 ? (
                      f.name
                    ) : (
                      <button className="btn btn-link text-cyber-accent text-decoration-none p-0 align-baseline" onClick={() => navigateToBreadcrumb(index)}>{f.name}</button>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Drag & Drop Target Area */}
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`upload-zone p-4 text-center mb-4 ${dragOver ? 'upload-zone-active' : ''}`}
          >
            {uploadProgress !== null ? (
              <div className="py-3">
                <h5 className="text-white mb-2">Cryptographic Encryption & Packing in progress...</h5>
                <div className="progress bg-dark mx-auto" style={{ height: '8px', maxWidth: '300px' }}>
                  <div className="progress-bar bg-info progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="small font-monospace text-muted mt-2">{uploadProgress}% Complete</div>
              </div>
            ) : (
              <div className="py-2 text-muted">
                <i className="bi bi-cloud-upload display-5 text-cyber-accent"></i>
                <div className="fw-semibold mt-2 text-white">Drag and drop secure file here</div>
                <div className="small font-monospace" style={{ fontSize: '0.75rem' }}>PNG, JPG, PDF, TXT, DOCX, ZIP (MAX 20MB)</div>
              </div>
            )}
          </div>

          {/* Core Folder & File Views */}
          {loading ? (
            <LoadingSpinner message="Decrypting workspace headers..." />
          ) : (
            <>
              {/* Folders Section (Only shown in 'drive' view) */}
              {currentView === 'drive' && folders.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-light mb-3 font-monospace text-uppercase" style={{ letterSpacing: '1.5px', fontSize: '0.8rem' }}>FOLDERS ({folders.length})</h5>
                  <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
                    {folders.map((f) => (
                      <div className="col" key={f.id} onDoubleClick={() => navigateToFolder(f)}>
                        <div className="folder-card p-3 d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2 text-truncate" style={{ cursor: 'pointer' }}>
                            <i className="bi bi-folder-fill text-info fs-5"></i>
                            <span className="text-light small text-truncate fw-semibold">{f.name}</span>
                          </div>
                          <button className="btn btn-link text-muted p-0" onClick={() => triggerDelete(f, 'folder')}>
                            <i className="bi bi-x-circle text-danger-hover"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              <div className="glass-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="text-light mb-0 font-monospace text-uppercase" style={{ letterSpacing: '1.5px', fontSize: '0.8rem' }}>
                    FILES ({files.length})
                  </h5>
                  
                  {/* Sorting controls */}
                  <div className="d-flex align-items-center gap-2">
                    <select className="form-select form-select-sm glass-input text-muted" value={sortField} onChange={(e) => setSortField(e.target.value)} style={{ width: '130px' }}>
                      <option value="original_name">Sort by Name</option>
                      <option value="size">Sort by Size</option>
                      <option value="upload_time">Sort by Date</option>
                    </select>
                    <button className="btn btn-sm btn-dark" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                      <i className={`bi ${sortOrder === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`}></i>
                    </button>
                  </div>
                </div>

                {sortedFiles.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-file-earmark-lock display-6 d-block mb-3 opacity-25"></i>
                    No secure files located in this directory space.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle mb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <thead>
                        <tr className="text-muted small text-uppercase font-monospace" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                          <th>Name</th>
                          <th>Size</th>
                          <th>Extension</th>
                          <th>Uploaded</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFiles.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <i className={`bi ${getFileIcon(file.file_type)} fs-5`}></i>
                                <span className="text-light text-truncate" style={{ maxWidth: '280px' }}>
                                  {file.original_name}
                                </span>
                                {file.favorite && (
                                  <i className="bi bi-star-fill text-warning small"></i>
                                )}
                              </div>
                            </td>
                            <td className="font-monospace small text-muted">{formatBytes(file.size)}</td>
                            <td>
                              <span className="badge bg-dark border border-secondary text-muted font-monospace text-uppercase" style={{ fontSize: '0.65rem' }}>
                                {file.file_type}
                              </span>
                            </td>
                            <td className="text-muted small">
                              {new Date(file.upload_time).toLocaleDateString('en-US', { dateStyle: 'short' })}
                            </td>
                            <td>
                              <div className="d-flex justify-content-end gap-1">
                                <button className="btn btn-sm btn-outline-info px-2 py-1" title="Download" onClick={() => handleDownload(file)}>
                                  <i className="bi bi-download"></i>
                                </button>
                                {['png', 'jpg', 'jpeg'].includes(file.file_type.toLowerCase()) && (
                                  <button className="btn btn-sm btn-outline-warning px-2 py-1" title="Preview" onClick={() => handlePreview(file)}>
                                    <i className="bi bi-eye"></i>
                                  </button>
                                )}
                                <button className="btn btn-sm btn-outline-secondary px-2 py-1" title="Favorite" onClick={() => handleToggleFavorite(file)}>
                                  <i className={`bi ${file.favorite ? 'bi-star-fill text-warning' : 'bi-star'}`}></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary px-2 py-1" title="Relocate" onClick={() => triggerMove(file)}>
                                  <i className="bi bi-folder-symlink"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary px-2 py-1" title="Rename" onClick={() => triggerRename(file)}>
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger px-2 py-1" title="Delete" onClick={() => triggerDelete(file, 'file')}>
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-cyber-dark text-white border border-secondary border-opacity-25">
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title font-monospace"><i className="bi bi-folder-plus text-info me-2"></i>New Secure Folder</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFolderModal(false)}></button>
              </div>
              <form onSubmit={handleCreateFolder}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted small font-monospace">FOLDER NAME</label>
                    <input type="text" className="form-control glass-input" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter name" required />
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25">
                  <button type="button" className="btn btn-sm btn-cyber-outline" onClick={() => setShowFolderModal(false)}>Close</button>
                  <button type="submit" className="btn btn-sm btn-cyber">Create Directory</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {showRenameModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-cyber-dark text-white border border-secondary border-opacity-25">
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title font-monospace"><i className="bi bi-pencil-square text-warning me-2"></i>Rename File</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRenameModal(false)}></button>
              </div>
              <form onSubmit={handleRename}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted small font-monospace">NEW NAME</label>
                    <input type="text" className="form-control glass-input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25">
                  <button type="button" className="btn btn-sm btn-cyber-outline" onClick={() => setShowRenameModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-cyber">Rename</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Move File Modal */}
      {showMoveModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-cyber-dark text-white border border-secondary border-opacity-25">
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title font-monospace"><i className="bi bi-folder-symlink text-info me-2"></i>Relocate File</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowMoveModal(false)}></button>
              </div>
              <form onSubmit={handleMove}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted small font-monospace">DESTINATION DIRECTORY</label>
                    <select className="form-select glass-input" value={destFolderId} onChange={(e) => setDestFolderId(e.target.value)} required>
                      <option value="">Select Target...</option>
                      <option value="root">My Drive (Root)</option>
                      {folders.map(f => (
                        <option value={f.id} key={f.id}>Folder: {f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25">
                  <button type="button" className="btn btn-sm btn-cyber-outline" onClick={() => setShowMoveModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-cyber">Relocate File</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-cyber-dark text-white border border-secondary border-opacity-25">
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title font-monospace text-truncate"><i className="bi bi-eye text-warning me-2"></i>Decrypted Image: {previewFile.original_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closePreview}></button>
              </div>
              <div className="modal-body text-center p-4">
                {previewUrl ? (
                  <img src={previewUrl} alt={previewFile.original_name} className="img-fluid rounded border border-secondary border-opacity-25 shadow-lg" style={{ maxHeight: '70vh' }} />
                ) : (
                  <LoadingSpinner message="Decrypting data block in client context..." />
                )}
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25">
                <button type="button" className="btn btn-sm btn-cyber-outline" onClick={closePreview}>Close Preview</button>
                <button type="button" className="btn btn-sm btn-cyber" onClick={() => { handleDownload(previewFile); closePreview(); }}><i className="bi bi-download me-1"></i>Download File</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog 
        show={confirmDelete.show}
        title={`Permanently Purge ${confirmDelete.type === 'file' ? 'File' : 'Folder'}`}
        message={`Are you sure you want to permanently delete this ${confirmDelete.type === 'file' ? 'file' : 'folder and all its nested files'}? This action will permanently remove all encrypted fragments from the disk storage block.`}
        confirmText="Confirm Purge"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ show: false, target: null, type: '' })}
      />

    </div>
  );
};

export default DashboardPage;
