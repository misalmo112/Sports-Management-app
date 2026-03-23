/**
 * Authentication utilities
 * 
 * Provides helper functions for authentication operations like logout
 */

/**
 * Clears all authentication-related data from localStorage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_academy_id');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_allowed_modules');
  localStorage.removeItem('selected_academy_id');
};

/**
 * Logs out the current user by clearing auth data and redirecting to login
 */
export const logout = (): void => {
  clearAuthData();
  // Redirect to login page
  window.location.href = '/login';
};
