import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ ...decoded, token });
        scheduleLogout(decoded.exp);
      } catch (err) {
        logout();
      }
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
