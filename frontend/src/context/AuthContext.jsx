import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { trackEvent } from '@/utils/analytics';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// Token storage
function getToken() { return localStorage.getItem('vp_token'); }
function setToken(token) { if (token) localStorage.setItem('vp_token', token); }
function clearToken() { localStorage.removeItem('vp_token'); localStorage.removeItem('vp_refresh'); }
function getRefresh() { return localStorage.getItem('vp_refresh'); }
function setRefresh(token) { if (token) localStorage.setItem('vp_refresh', token); }

// Create axios instance with auth header
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) { setUser(false); setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`, {
        headers: authHeaders(), withCredentials: true
      });
      setUser(data);
    } catch {
      clearToken();
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      if (data.access_token) { setToken(data.access_token); setRefresh(data.refresh_token); }
      setUser(data);
      trackEvent('login_success', { role: data.role });
      return { success: true, user: data };
    } catch (e) {
      trackEvent('login_failed', { error: e.response?.data?.detail });
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/register`,
        userData,
        { withCredentials: true }
      );
      if (data.access_token) { setToken(data.access_token); setRefresh(data.refresh_token); }
      setUser(data);
      trackEvent('signup_completed', { role: data.role });
      return { success: true, user: data };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        headers: authHeaders(), withCredentials: true
      });
    } catch {}
    clearToken();
    setUser(false);
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/api/auth/profile`,
        profileData,
        { headers: authHeaders(), withCredentials: true }
      );
      setUser(data);
      return { success: true, user: data };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const getThemeMode = () => {
    if (!user || user === false) return 'passage';
    const kindlingDischarges = ['oth', 'bad-conduct-special', 'bad-conduct-general', 'dishonorable', 'dismissal'];
    return kindlingDischarges.includes(user.discharge) ? 'kindling' : 'passage';
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateProfile,
      themeMode: getThemeMode(),
      isAuthenticated: !!user && user !== false
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Axios interceptor — auto-attach Bearer token to all requests
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
