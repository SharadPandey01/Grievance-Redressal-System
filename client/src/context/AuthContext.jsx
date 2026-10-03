import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { AuthContext } from './authContextInstance';
import { Spinner } from '../components/ui/Spinner';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  // Initialize and verify user on mount if token exists
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      return;
    }

    let isMounted = true;

    authApi
      .getMe()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
      return currentUser;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }
      return null;
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    const { token: receivedToken, user: receivedUser } = data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const createdUser = await authApi.register(userData);
    return createdUser;
  }, []);

  const updateProfile = useCallback(async (data) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    return updated;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const setManualUser = useCallback((customUser) => {
    setUser(customUser);
    if (customUser) {
      localStorage.setItem('user', JSON.stringify(customUser));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setToken(null);
    }
  }, []);

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    setManualUser,
  };

  // Full-page spinner while initial session hydration completes
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="xl" className="text-indigo-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
