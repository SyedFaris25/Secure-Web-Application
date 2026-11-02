/**
 * =============================================================================
 * Axios API Client Configuration
 * =============================================================================
 * SECURITY FEATURES:
 *   - Automatic injection of JWT Bearer tokens on protected endpoints
 *   - Handling of expired JWT access tokens with token refresh flow
 *   - Auto-logout capability if refresh token expires or authentication fails
 *   - Checks both localStorage and sessionStorage for token (Remember Me support)
 *
 * OWASP PROTECTIONS:
 *   - Broken Authentication: Prevents reuse of expired sessions. Automatically
 *     requests a fresh access token using a separate refresh token.
 * =============================================================================
 */

import axios from 'axios';

/**
 * Helper to get a storage item from either localStorage or sessionStorage.
 * SECURITY: Supports both persistent and transient session modes.
 */
const getStorageItem = (key) => {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
};

/**
 * Helper to set a storage item to whichever storage is currently active.
 */
const setStorageItem = (key, value) => {
  // If localStorage has the access token, user chose "Remember Me"
  if (localStorage.getItem('accessToken')) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
};

// Determine baseURL dynamically: Use VITE_API_URL env variable in production, fallback to proxy in dev
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return import.meta.env.MODE === 'development' ? '' : 'http://localhost:5000';
};

// Create API client instance
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Reasonable timeout to prevent denial-of-service hanging
});

// Flag to prevent multiple simultaneous token refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ---------------------------------------------------------------------------
// REQUEST INTERCEPTOR: Inject JWT Token
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = getStorageItem('accessToken');
    if (token) {
      // SECURITY: Bearer authentication token attached in HTTP header, not in URL parameters
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// RESPONSE INTERCEPTOR: Handle Expired Access Token & Token Refresh Flow
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request has not already been retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // If we are logging out, or registering, or logging in, don't attempt refresh
      if (
        originalRequest.url.includes('/login') ||
        originalRequest.url.includes('/register') ||
        originalRequest.url.includes('/logout') ||
        originalRequest.url.includes('/refresh')
      ) {
        return Promise.reject(error);
      }

      const refreshToken = getStorageItem('refreshToken');
      if (!refreshToken) {
        // No refresh token available, session is unrecoverable
        handleSessionExpired();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // SECURITY: Request new access token using refresh token in Auth header
        const response = await axios.post(`${getBaseURL()}/api/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        const newAccessToken = response.data.accessToken;
        setStorageItem('accessToken', newAccessToken);

        // Resume queued requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token has expired or is invalid
        processQueue(refreshError, null);
        isRefreshing = false;
        handleSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    if (!error.response) {
      // SECURITY: Centralized handling for offline APIs / connection drops
      window.location.href = '/error?type=offline';
      return Promise.reject(error);
    }

    if (error.response.status === 403) {
      window.location.href = '/error?type=unauthorized';
      return Promise.reject(error);
    }

    if (error.response.status === 500) {
      window.location.href = '/error?type=500';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle expired session
const handleSessionExpired = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  
  // Dispatch custom window event so React Context can catch it and update state
  window.dispatchEvent(new Event('auth-session-expired'));
  
  // Redirect to expired page
  window.location.href = '/error?type=expired';
};

export default api;
