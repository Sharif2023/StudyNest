import axios from "axios";

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Auto-detect the correct path
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  if (isLocalhost) {
    const port = 8000;
    const hasStudyNestInPath = window.location.pathname.includes("study-nest");
    return hasStudyNestInPath 
      ? `http://localhost:${port}/study-nest/api` 
      : `http://localhost:${port}/api`;
  }
  
  return window.location.origin + "/api";
};

export const API_BASE = getApiBase();

export function getBackendOrigin() {
  try {
    const m = String(API_BASE).match(/^https?:\/\/[^/]+/i);
    if (m && m[0]) return m[0];
  } catch {
    // Fall back to the current browser origin when API_BASE is malformed.
  }
  return (typeof window !== "undefined" && window.location.origin) || "http://localhost:8000";
}

export function toBackendUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:")) return url;
  
  const apiRoot = API_BASE.replace(/\/+$/, "");
  const backendOrigin = getBackendOrigin().replace(/\/+$/, "");
  let cleanUrl = url.startsWith("/") ? url : "/" + url;

  if (cleanUrl.startsWith("/src/api/")) {
    cleanUrl = cleanUrl.replace(/^\/src\/api\//, "/api/");
  }
  if (cleanUrl.startsWith("/api/")) {
    return backendOrigin + cleanUrl;
  }
  return apiRoot + cleanUrl;
}

/** 
 * Axios Instance with Interceptors 
 * This is the preferred way to make API calls now.
 */
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("studynest.jwt");
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized! Redirecting to login...");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export function hasToken() {
  const t = localStorage.getItem("studynest.jwt");
  return !!(t && t !== "undefined" && t !== "null" && !t.startsWith("undefined"));
}
