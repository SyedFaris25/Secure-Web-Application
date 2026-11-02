/**
 * =============================================================================
 * Client-Side Input Validators
 * =============================================================================
 * SECURITY FEATURES:
 *   - Client-side validation for instant UX feedback and matching password policies
 *   - Password strength checker to ensure strong passwords before submission
 *
 * OWASP: Insecure Design (Defence-in-Depth validation layer)
 * =============================================================================
 */

/**
 * Validate email syntax.
 */
export const validateEmail = (email) => {
  if (!email) return 'Email address is required.';
  
  // Standard robust RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address.';
  }
  return '';
};

/**
 * Validate password requirements.
 * Policy: Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  
  if (password.length < 12) {
    return 'Password must be at least 12 characters long.';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit.';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return '';
};

/**
 * Measure password strength score from 0 to 4.
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0;
  
  let score = 0;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  
  return score;
};

/**
 * Get strength label and color class name based on score.
 */
export const getStrengthLabel = (score) => {
  switch (score) {
    case 0:
    case 1:
      return { label: 'Weak', color: 'danger', class: 'weak' };
    case 2:
      return { label: 'Fair', color: 'warning', class: 'fair' };
    case 3:
      return { label: 'Good', color: 'info', class: 'good' };
    case 4:
      return { label: 'Strong', color: 'success', class: 'strong' };
    default:
      return { label: 'Weak', color: 'danger', class: 'weak' };
  }
};

/**
 * Validate full name.
 */
export const validateName = (name) => {
  if (!name || !name.trim()) return 'Full name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters long.';
  if (name.trim().length > 100) return 'Name cannot exceed 100 characters.';
  return '';
};
