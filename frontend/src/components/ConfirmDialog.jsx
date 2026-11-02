/**
 * =============================================================================
 * ConfirmDialog Component
 * =============================================================================
 * Glassmorphic overlay dialog modal for secure confirmation actions (e.g. logout).
 * =============================================================================
 */

import React from 'react';

const ConfirmDialog = ({
  show,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
  children,
}) => {
  if (!show) return null;

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)' }}
      tabIndex="-1"
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content glass-card border border-secondary text-light">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <i className={`bi ${isDangerous ? 'bi-exclamation-triangle-fill text-danger' : 'bi-question-circle-fill text-info'}`}></i>
              {title}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close"
              onClick={onCancel}
            ></button>
          </div>
          <div className="modal-body py-4">
            <p className="m-0 text-muted">{message}</p>
            {children}
          </div>
          {!children && (
            <div className="modal-footer border-top-0 pt-0 gap-2">
              <button 
                type="button" 
                className="btn btn-cyber-outline py-2 px-3 btn-sm" 
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button 
                type="button" 
                className={`btn btn-sm py-2 px-3 ${isDangerous ? 'btn-danger' : 'btn-cyber'}`}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
