import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import axios from 'axios';
import { useAuth } from './useAuth.jsx';

// API_BASE from existing config
import { API_BASE } from '../apiConfig.js';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('studynest.jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try refresh token (implement in Phase 2)
        const refreshToken = localStorage.getItem('studynest.refresh');
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token } = refreshResponse.data;
        localStorage.setItem('studynest.jwt', access_token);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('studynest.profile');
        localStorage.removeItem('studynest.jwt');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API hooks
export const useApiQuery = (options) => {
  const queryClient = useQueryClient();
  return useQuery({
    ...options,
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey;
      const response = await api.get(url, { params });
      return response.data;
    },
  });
};

export const useApiMutation = (options = {}) => {
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      const { url, method = 'POST', data } = payload;
      const response = await api[method.toLowerCase()](url, data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [variables.url.split('?')[0]] });
      if (options.onSuccess) options.onSuccess(data, variables, context);
    },
  });
};

// QueryClient with defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    },
  },
});

// Provider component
export function ApiProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// API convenience functions
export const apiTodos = {
  useList: () => useApiQuery(['todo.php', { user_id: useAuth().user?.id }]),
  useCreate: () => useApiMutation(),
  useUpdate: (id) => useApiMutation({ mutationKey: ['todo.php', id] }),
  useDelete: (id) => useApiMutation({ method: 'DELETE' }),
};

export const apiCourses = {
  useList: (params) => useApiQuery(['courses.php', params]),
};

export default api;

