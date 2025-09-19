'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Load the user authentication state from localStorage when the component mounts
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        
        if (storedUser && storedAccessToken) {
          setUser(JSON.parse(storedUser));
          setAccessToken(storedAccessToken);
          if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted storage
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      initializeAuth();
    }
  }, []);

  // Get auth token for API requests
  const getIdToken = async () => {
    // Return existing token if available
    if (accessToken) {
      return accessToken;
    }
    
    // If we have a refresh token but no access token, try to refresh
    if (refreshToken && !accessToken) {
      try {
        const newToken = await refreshAccessToken();
        return newToken;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Force logout if refresh fails
        logout();
        throw new Error('Authentication expired. Please log in again.');
      }
    }
    
    throw new Error('No authentication token available');
  };
  
  // Refresh the access token using the refresh token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Update stored tokens
      localStorage.setItem('accessToken', data.accessToken);
      setAccessToken(data.accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
        setRefreshToken(data.refreshToken);
      }
      
      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store tokens and user data
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      
      return data.user;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return data.user;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Only make the API call if we have a token
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear stored data regardless of API success/failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  // Update user data in context and localStorage
  const updateUserData = (updatedUser) => {
    if (!updatedUser) return;
    
    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
    const newUserData = { ...currentUser, ...updatedUser };
    
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  // Add authorization header to fetch requests
  const authFetch = async (url, options = {}) => {
    try {
      // Get the token
      const token = await getIdToken();
      
      // Add authorization header
      const authOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Make the request
      const response = await fetch(url, authOptions);
      
      // Handle 401 Unauthorized errors by trying to refresh the token
      if (response.status === 401 && refreshToken) {
        try {
          // Try to refresh the token
          const newToken = await refreshAccessToken();
          
          // Retry the request with the new token
          const retryOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`
            }
          };
          
          return fetch(url, retryOptions);
        } catch (refreshError) {
          // If refresh fails, log out and throw an error
          logout();
          throw new Error('Authentication expired. Please log in again.');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Auth fetch error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        register, 
        loading, 
        initialized,
        updateUserData,
        getIdToken,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);