/**
 * API client for the Flask spam detection service
 */

// The base URL for the API - change this based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper to get the auth token from local storage
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Helper to set the auth token in local storage
export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

// Helper to remove the auth token from local storage
export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Check if the API is available
 */
export async function checkApiHealth() {
  try {
    // Use a more reliable endpoint with proper error handling
    // Add cache-busting query parameter to prevent caching
    const timestamp = new Date().getTime();
    
    // Use AbortSignal.timeout() instead of setTimeout + abort
    const response = await fetch(`${API_BASE_URL}/?_=${timestamp}`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
      // Avoid credentials and complex headers that trigger preflight
      mode: 'cors',
      cache: 'no-cache',
    });
    
    // Just check if we got any response
    return response.ok;
  } catch (error) {
    // Silently handle the error but return false
    console.error('API health check failed:', error);
    return false;
  }
}