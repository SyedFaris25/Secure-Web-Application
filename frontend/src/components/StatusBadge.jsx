/**
 * =============================================================================
 * StatusBadge Component
 * =============================================================================
 * Badge indicating success or secondary status.
 * =============================================================================
 */

import React from 'react';

const StatusBadge = ({ active = true, labelActive = 'Active', labelInactive = 'Disabled' }) => {
  return (
    <span className={`badge ${active ? 'badge-cyber-success' : 'badge-cyber'} px-3 py-2 font-monospace`}>
      <span className="me-1" style={{ fontSize: '0.65rem' }}>
        {active ? '●' : '○'}
      </span>
      {active ? labelActive : labelInactive}
    </span>
  );
};

export default StatusBadge;
