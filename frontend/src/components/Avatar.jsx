/**
 * =============================================================================
 * Avatar Component
 * =============================================================================
 * Generates a profile avatar with user's initials and a cyber-themed gradient.
 * =============================================================================
 */

import React from 'react';

const Avatar = ({ name = 'Secure User', size = 48 }) => {
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  // Gradient styles
  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#030712',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: `${size * 0.4}px`,
    boxShadow: '0 0 15px rgba(0, 242, 254, 0.25)',
    userSelect: 'none',
  };

  return (
    <div style={avatarStyle} title={name}>
      {initials}
    </div>
  );
};

export default Avatar;
