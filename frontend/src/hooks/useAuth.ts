import { useState, useEffect } from 'react';
import { AuthService, AuthResponse } from '../services/auth.service';
import { User } from '../api/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && AuthService.isAuthenticated()) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
    setLoading(false);

    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Login failed';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: Parameters<typeof AuthService.register>[0]): Promise<AuthResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await AuthService.register(payload);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Registration failed';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout
  };
}
