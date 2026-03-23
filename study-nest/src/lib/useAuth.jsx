import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../apiConfig.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const profile = localStorage.getItem('studynest.profile');
    const token = localStorage.getItem('studynest.jwt');
    
    if (profile) {
      try {
        setUser(JSON.parse(profile));
      } catch {
        localStorage.removeItem('studynest.profile');
        localStorage.removeItem('studynest.jwt');
      }
    }
    setLoading(false);
  }, []);

  // Auto-login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await apiClient.post("login.php", { email, password });
      
      const data = response.data;
      if (data.ok) {
        localStorage.setItem('studynest.auth', JSON.stringify(data.user));
        localStorage.setItem('studynest.profile', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('studynest.jwt', data.token);
        else localStorage.removeItem('studynest.jwt');
        window.dispatchEvent(new Event('studynest:auth-changed'));
        setUser(data.user);
        return data;
      }
      throw new Error(data.error || 'Login failed');
    },
    onSuccess: (data) => {
      // Refetch todos optimistically
      window.location.reload(); // Simple refresh for now
    },
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('studynest.profile');
      localStorage.removeItem('studynest.jwt');
      setUser(null);
      // Clear all queries
      window.location.href = '/login';
    },
  });

  // Check if token expired
  const isAuthenticated = !!user;
  
  const value = {
    user,
    loading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isAuthenticated,
    loginLoading: loginMutation.isPending,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

