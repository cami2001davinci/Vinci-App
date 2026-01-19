import { createContext, useContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "../api/axiosInstance";
import { reconnectSocket } from "../services/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const logoutTimerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Mezclo payload del token + token bruto
        setUser({ ...decoded, token });
        scheduleLogout(decoded.exp);
        reconnectSocket(token);

        const fetchProfile = async () => {
          try {
            const res = await axios.get("/users/me");
            // Mezclo el perfil del backend sobre lo que ya tenía del token
            setUser((prev) => ({ ...prev, ...res.data }));
          } catch (err) {
            console.error("Error al obtener perfil:", err);
          } finally {
            setLoading(false);
          }
        };

        fetchProfile();
      } catch (err) {
        console.error("Token inválido o expirado:", err);
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleLogout = (exp) => {
    const msUntilExpire = exp * 1000 - Date.now();

    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    if (msUntilExpire <= 0) {
      // Si ya venció, deslogueo directo
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(() => logout(), msUntilExpire);
  };

  const login = (token, rememberMe = false) => {
    const decoded = jwtDecode(token);
    setUser({ ...decoded, token });
    scheduleLogout(decoded.exp);

    if (rememberMe) {
      localStorage.setItem("token", token);
      sessionStorage.removeItem("token");
    } else {
      sessionStorage.setItem("token", token);
      localStorage.removeItem("token");
    }
    reconnectSocket(token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    reconnectSocket(null);
  };

  const refreshUserProfile = async () => {
    try {
      const res = await axios.get("/users/me");
      setUser((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error("Error al refrescar perfil:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, setUser, logout, loading, refreshUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
