import { useState, useEffect } from "react";
import { login as loginRequest } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { socket } from "../services/socket";


export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("rememberMe") === "true";
    setRememberMe(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("rememberMe", rememberMe);
  }, [rememberMe]);

  const esIdentificadorValido = (valor) => {
    return !valor.includes("@") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  };

  const handleLogin = async (e) => {
  e.preventDefault();
  let newErrors = {};

  if (!identifier) newErrors.identifier = "Este campo es obligatorio";
  else if (!esIdentificadorValido(identifier)) {
    newErrors.identifier = "Debe ser un email o un nombre de usuario válido";
  }
  if (!password) newErrors.password = "La contraseña es obligatoria";

  setErrors(newErrors);
  if (Object.keys(newErrors).length > 0) return;

  try {
    const res = await loginRequest({
      identifier: identifier.trim(),
      password: password.trim(),
    });

    // 1) Guardar token
    localStorage.setItem("token", res.data.token);
    const token = res.data.token;

    // 2) Re-handshake del socket con el nuevo token
    socket.auth = { token };
    if (socket.connected) socket.disconnect();
    socket.connect();

    // 3) Actualizar auth de tu app
    login(res.data.token, rememberMe);

    // 4) Redirección
    if (res.data.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 400 && Array.isArray(data.errors)) {
      const [firstError] = data.errors;
      if (firstError.toLowerCase().includes("contraseña")) {
        setErrors({ password: firstError });
      } else if (
        firstError.toLowerCase().includes("email") ||
        firstError.toLowerCase().includes("usuario")
      ) {
        setErrors({ identifier: firstError });
      } else {
        setErrors({ general: firstError });
      }
      return;
    }

    if (status === 401) {
      const msg = data.message || "";
      if (msg.toLowerCase().includes("contraseña")) {
        setErrors({ password: "Contraseña incorrecta" });
      } else if (
        msg.toLowerCase().includes("email") ||
        msg.toLowerCase().includes("usuario")
      ) {
        setErrors({ identifier: "Usuario o email no encontrado" });
      } else {
        setErrors({ general: "Credenciales incorrectas" });
      }
    } else {
      setErrors({ general: "Error del servidor. Inténtalo más tarde." });
    }
  }
};


  return (
    <main className="login-page">
      <section className="login-heading">
        <figure>
          <img className="logo" src="/img/logo-2.svg" alt="" />
        </figure>
        <h1 id="login-heading">Iniciar Sesión</h1>
        <h2>
          ¡Hola de nuevo! Nos hacía falta tu toque. Entra y sigamos creando
          juntos en Vinci.
        </h2>

        <form onSubmit={handleLogin} noValidate>
          {errors.general && (
            <div className="alert alert-danger">{errors.general}</div>
          )}

          <div className="holder">
            <input
              type="text"
              id="identifier"
              className={`form-control ${
                errors.identifier ? "is-invalid" : ""
              }`}
              placeholder=" Email o usuario"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setErrors({ ...errors, identifier: "" });
              }}
            />
            {errors.identifier && (
              <div className="invalid-feedback">{errors.identifier}</div>
            )}
          </div>

          <div className="holder">
            <input
              type="password"
              id="password"
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              placeholder=" Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: "" });
              }}
            />
            {errors.password && (
              <div className="invalid-feedback">{errors.password}</div>
            )}
          </div>

          {}
          <div
            className="mb-3"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              className="form-check"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input
                type="checkbox"
                className="form-check-input"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label
                className="form-check-label"
                htmlFor="rememberMe"
                style={{ marginLeft: 8 }}
              >
                Recordarme
              </label>
            </div>

            <div>
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                style={{ fontWeight: "bold", color: "black" }}
              >
                Regístrate
              </Link>
            </div>
          </div>

          <button type="submit" className="btn-base">
            Iniciar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
