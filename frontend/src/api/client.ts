import axios from 'axios';

// Get API base URL dynamically based on Vite / Webpack / Next.js configurations
const getBaseUrl = (): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
  }
  
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lead_intelligence_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle systemic issues (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request. Logging out user session.');
      localStorage.removeItem('lead_intelligence_token');
      localStorage.removeItem('lead_intelligence_user');
      
      // Dispatch custom event to let React components react to logout
      window.dispatchEvent(new Event('auth_session_expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
