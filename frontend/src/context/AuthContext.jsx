/**
 * =============================================================================
 * Authentication React Context Provider
 * =============================================================================
 * SECURITY FEATURES:
 *   - Secure Session Handling: Differentiates between transient and persistent
 *     storage depending on the "Remember Me" checkbox.
 *     - Transient (sessionStorage): Deleted when browser tab is closed.
 *     - Persistent (localStorage): Saved on disk, allowed for remember-me.
 *   - Expired JWT token handling via custom session-expired event listeners.
 *
 * OWASP PROTECTIONS:
 *   - Broken Authentication: Session state and token storage isolation.
 * =============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth state from storage on app load
  useEffect(() => {
    const initializeAuth = () => {
      // Check both local storage and session storage
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          clearStorage();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for custom auto-logout events emitted by the Axios interceptor
    const handleSessionExpired = () => {
      clearStorage();
      setUser(null);
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

  const clearStorage = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  };

  /**
   * Register a new user.
   */
  const register = async (name, email, password, confirmPassword) => {
    setLoading(true);
    try {
      const response = await api.post('/api/register', {
        name,
        email,
        password,
        confirmPassword,
      });

      const { user: userData, accessToken, refreshToken } = response.data;
      
      // By default, registration stores in transient sessionStorage
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
      sessionStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed.',
        details: error.response?.data?.details || [],
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log in user.
   * SECURITY: If rememberMe is checked, store tokens in localStorage.
   *           Otherwise, store in sessionStorage so they disappear on tab close.
   */
  const login = async (email, password, rememberMe) => {
    setLoading(true);
    try {
      const response = await api.post('/api/login', { email, password });
      const { user: userData, accessToken, refreshToken } = response.data;

      clearStorage();

      if (rememberMe) {
        // Persistent session
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Transient session (destroyed on window close)
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
      }

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Invalid credentials.',
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out user.
   * SECURITY: Notifies the server to blacklist the token immediately.
   */
  const logout = async () => {
    setLoading(true);
    try {
      // Attempt backend revocation (best effort)
      await api.post('/api/logout');
    } catch (e) {
      console.warn('Backend logout failed or was already unauthorized:', e);
    } finally {
      clearStorage();
      setUser(null);
      setLoading(false);
    }
  };

  /**
   * Update active user data in local states.
   */
  const updateUserData = (updatedUser, rememberMe = false) => {
    const isPersistent = !!localStorage.getItem('accessToken');
    
    if (isPersistent) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
