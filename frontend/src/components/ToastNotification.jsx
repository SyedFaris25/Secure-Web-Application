/**
 * =============================================================================
 * ToastNotification Component
 * =============================================================================
 * Renders a stacked list of alert messages in the bottom-right of the viewport.
 * =============================================================================
 */

import React from 'react';

const ToastNotification = ({ toasts, onDismiss }) => {
  const getToastClass = (type) => {
    switch (type) {
      case 'success':
        return 'bg-success text-white';
      case 'error':
        return 'bg-danger text-white';
      case 'warning':
        return 'bg-warning text-dark';
      case 'info':
      default:
        return 'bg-info text-dark';
    }
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-exclamation-octagon-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  };

  return (
    <div 
      className="toast-container position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 1100 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show border-0 glass-card mb-2 ${getToastClass(toast.type)}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{ opacity: 0.95, minWidth: '280px' }}
        >
          <div className="d-flex p-3 align-items-center">
            <i className={`bi ${getToastIcon(toast.type)} me-2 fs-5`}></i>
            <div className="toast-body flex-grow-1 p-0 font-monospace small">
              {toast.message}
            </div>
            <button
              type="button"
              className={`btn-close ms-2 ${toast.type === 'warning' || toast.type === 'info' ? '' : 'btn-close-white'}`}
              aria-label="Close"
              onClick={() => onDismiss(toast.id)}
            ></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
