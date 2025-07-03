import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from '../api/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const logoutTimerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ ...decoded, token });
        scheduleLogout(decoded.exp);

        const fetchProfile = async () => {
          try {
            const res = await axios.get('/users/me');
            setUser(prev => ({ ...prev, ...res.data }));
          } catch (err) {
            console.error('Error al obtener perfil:', err);
          } finally {
            setLoading(false);
          }
        };

        fetchProfile();
      } catch (err) {
        console.error('Token inválido o expirado:', err);
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const scheduleLogout = (exp) => {
    const msUntilExpire = exp * 1000 - Date.now();
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => logout(), msUntilExpire);
  };

  const login = (token, rememberMe = false) => {
    const decoded = jwtDecode(token);
    setUser({ ...decoded, token });
    scheduleLogout(decoded.exp);
    rememberMe
      ? localStorage.setItem('token', token)
      : sessionStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  };

  const refreshUserProfile = async () => {
    try {
      const res = await axios.get('/users/me');
      setUser(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error('Error al refrescar perfil:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, setUser, logout, loading, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
