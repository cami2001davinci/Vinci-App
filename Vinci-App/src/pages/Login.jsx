// import { useState, useEffect } from "react";
// import { login as loginRequest } from "../api/auth";
// import { useAuth } from "../context/AuthContext";
// import { useNavigate, Link } from "react-router-dom";
// import { socket } from "../services/socket";

// export default function Login() {
//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);
//   const [errors, setErrors] = useState({});
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     const stored = localStorage.getItem("rememberMe") === "true";
//     setRememberMe(stored);
//   }, []);

//   useEffect(() => {
//     localStorage.setItem("rememberMe", rememberMe);
//   }, [rememberMe]);

//   const esIdentificadorValido = (valor) => {
//     return !valor.includes("@") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
//   };

//   const handleLogin = async (e) => {
//   e.preventDefault();
//   let newErrors = {};

//   if (!identifier) newErrors.identifier = "Este campo es obligatorio";
//   else if (!esIdentificadorValido(identifier)) {
//     newErrors.identifier = "Debe ser un email o un nombre de usuario válido";
//   }
//   if (!password) newErrors.password = "La contraseña es obligatoria";

//   setErrors(newErrors);
//   if (Object.keys(newErrors).length > 0) return;

//   try {
//     const res = await loginRequest({
//       identifier: identifier.trim(),
//       password: password.trim(),
//     });

//     // 1) Guardar token
//     localStorage.setItem("token", res.data.token);
//     const token = res.data.token;

//     // 2) Re-handshake del socket con el nuevo token
//     socket.auth = { token };
//     if (socket.connected) socket.disconnect();
//     socket.connect();

//     // 3) Actualizar auth de tu app
//     login(res.data.token, rememberMe);

//     // 4) Redirección
//     if (res.data.role === "admin") {
//       navigate("/dashboard");
//     } else {
//       navigate("/");
//     }
//   } catch (err) {
//     console.error("Error al iniciar sesión:", err);
//     const status = err.response?.status;
//     const data = err.response?.data;

//     if (status === 400 && Array.isArray(data.errors)) {
//       const [firstError] = data.errors;
//       if (firstError.toLowerCase().includes("contraseña")) {
//         setErrors({ password: firstError });
//       } else if (
//         firstError.toLowerCase().includes("email") ||
//         firstError.toLowerCase().includes("usuario")
//       ) {
//         setErrors({ identifier: firstError });
//       } else {
//         setErrors({ general: firstError });
//       }
//       return;
//     }

//     if (status === 401) {
//       const msg = data.message || "";
//       if (msg.toLowerCase().includes("contraseña")) {
//         setErrors({ password: "Contraseña incorrecta" });
//       } else if (
//         msg.toLowerCase().includes("email") ||
//         msg.toLowerCase().includes("usuario")
//       ) {
//         setErrors({ identifier: "Usuario o email no encontrado" });
//       } else {
//         setErrors({ general: "Credenciales incorrectas" });
//       }
//     } else {
//       setErrors({ general: "Error del servidor. Inténtalo más tarde." });
//     }
//   }
// };

//   return (
//     <main className="login-page">
//       <section className="login-heading">
//         <figure>
//           <img className="logo" src="/img/logo-2.svg" alt="" />
//         </figure>
//         <h1 id="login-heading">Iniciar Sesión</h1>
//         <h2>
//           ¡Hola de nuevo! Nos hacía falta tu toque. Entra y sigamos creando
//           juntos en Vinci.
//         </h2>

//         <form onSubmit={handleLogin} noValidate>
//           {errors.general && (
//             <div className="alert alert-danger">{errors.general}</div>
//           )}

//           <div className="holder">
//             <input
//               type="text"
//               id="identifier"
//               className={`form-control ${
//                 errors.identifier ? "is-invalid" : ""
//               }`}
//               placeholder=" Email o usuario"
//               value={identifier}
//               onChange={(e) => {
//                 setIdentifier(e.target.value);
//                 setErrors({ ...errors, identifier: "" });
//               }}
//             />
//             {errors.identifier && (
//               <div className="invalid-feedback">{errors.identifier}</div>
//             )}
//           </div>

//           <div className="holder">
//             <input
//               type="password"
//               id="password"
//               className={`form-control ${errors.password ? "is-invalid" : ""}`}
//               placeholder=" Contraseña"
//               value={password}
//               onChange={(e) => {
//                 setPassword(e.target.value);
//                 setErrors({ ...errors, password: "" });
//               }}
//             />
//             {errors.password && (
//               <div className="invalid-feedback">{errors.password}</div>
//             )}
//           </div>

//           {}
//           <div
//             className="mb-3"
//             style={{
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//             }}
//           >
//             <div
//               className="form-check"
//               style={{ display: "flex", alignItems: "center" }}
//             >
//               <input
//                 type="checkbox"
//                 className="form-check-input"
//                 id="rememberMe"
//                 checked={rememberMe}
//                 onChange={(e) => setRememberMe(e.target.checked)}
//               />
//               <label
//                 className="form-check-label"
//                 htmlFor="rememberMe"
//                 style={{ marginLeft: 8 }}
//               >
//                 Recordarme
//               </label>
//             </div>

//             <div>
//               ¿No tienes una cuenta?{" "}
//               <Link
//                 to="/register"
//                 style={{ fontWeight: "bold", color: "black" }}
//               >
//                 Regístrate
//               </Link>
//             </div>
//           </div>

//           <button type="submit" className="btn-base">
//             Iniciar sesión
//           </button>
//         </form>
//       </section>
//     </main>
//   );
// }
import { useState, useEffect } from "react";
import {
  login as loginRequest,
  register as registerRequest,
} from "../api/auth";
import { useAuth } from "../context/AuthContext";
import "../styles/LoginAndRegister.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  // ---- LOGIN state ----
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});

  // ---- REGISTER state ----
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState({});
  const [regLoading, setRegLoading] = useState(false);

  // ---- UI: modo login / sign-up ----
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Remember me
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

  // ================== LOGIN ==================
  const handleLogin = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!identifier) newErrors.identifier = "Este campo es obligatorio";
    else if (!esIdentificadorValido(identifier)) {
      newErrors.identifier = "Debe ser un email o un nombre de usuario válido";
    }
    if (!password) newErrors.password = "La contraseña es obligatoria";

    setLoginErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await loginRequest({
        identifier: identifier.trim(),
        password: password.trim(),
      });

      // Guardar token + actualizar contexto
      login(res.data.token, rememberMe);

      // Redirección por rol
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
          setLoginErrors({ password: firstError });
        } else if (
          firstError.toLowerCase().includes("email") ||
          firstError.toLowerCase().includes("usuario")
        ) {
          setLoginErrors({ identifier: firstError });
        } else {
          setLoginErrors({ general: firstError });
        }
        return;
      }

      if (status === 401) {
        const msg = data.message || "";
        if (msg.toLowerCase().includes("contraseña")) {
          setLoginErrors({ password: "Contraseña incorrecta" });
        } else if (
          msg.toLowerCase().includes("email") ||
          msg.toLowerCase().includes("usuario")
        ) {
          setLoginErrors({ identifier: "Usuario o email no encontrado" });
        } else {
          setLoginErrors({ general: "Credenciales incorrectas" });
        }
      } else {
        setLoginErrors({ general: "Error del servidor. Inténtalo más tarde." });
      }
    }
  };

  // ================== REGISTER ==================
  const handleRegister = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!regUsername.trim()) newErrors.username = "El usuario es obligatorio";
    if (!regEmail.trim()) newErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      newErrors.email = "Ingresa un email válido";
    }
    if (!regPassword) newErrors.password = "La contraseña es obligatoria";

    setRegErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setRegLoading(true);

      const res = await registerRequest({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
      });

      // Opcional: loguear automáticamente tras registrarse
      if (res.data?.token) {
        login(res.data.token, true);
        navigate("/");
      } else {
        // Si tu backend no devuelve token, solo volvemos al login
        setIsSignUpMode(false);
        setIdentifier(regEmail.trim());
      }
    } catch (err) {
      console.error("Error al registrarse:", err);
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && Array.isArray(data.errors)) {
        const [firstError] = data.errors;
        if (firstError.toLowerCase().includes("usuario")) {
          setRegErrors({ username: firstError });
        } else if (firstError.toLowerCase().includes("email")) {
          setRegErrors({ email: firstError });
        } else if (firstError.toLowerCase().includes("contraseña")) {
          setRegErrors({ password: firstError });
        } else {
          setRegErrors({ general: firstError });
        }
        return;
      }

      setRegErrors({
        general: data?.message || "No se pudo completar el registro.",
      });
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoToRegister = () => {
    // Activo la animación del template
    setIsSignUpMode(true);

    // Cuando termina la animación, voy a /register
    setTimeout(() => {
      navigate("/register");
    }, 800); // 0.8s aprox, matchea el CSS
  };

  return (
    <main className="login-page">
      {/* OJO: acá se aplica la clase sign-up-mode para la animación */}
      <div className={`container ${isSignUpMode ? "sign-up-mode" : ""}`}>
        {/* ====== FORMULARIOS (login + signup) ====== */}
        <div className="forms-container">
          <div className="signin-signup">
            {/* ---------- LOGIN FORM ---------- */}
            <form
              className="sign-in-form"
              onSubmit={handleLogin}
              noValidate
              aria-labelledby="login-heading"
            >
              <figure style={{ marginBottom: "1rem" }}>
                <img className="logo" src="../public/img/1.png" alt="Vinci logo" />
              </figure>

              <h2 id="login-heading" className="title">
                Iniciar Sesión
              </h2>
              <p style={{ marginBottom: "1rem", textAlign: "center" }}>
                ¡Hola de nuevo! Nos hacía falta tu toque. Entra y sigamos
                creando juntos en Vinci.
              </p>

              {loginErrors.general && (
                <div className="alert alert-danger">{loginErrors.general}</div>
              )}

              {/* IDENTIFIER */}
              <div className="input-field">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="identifier"
                  placeholder="Email o usuario"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setLoginErrors((prev) => ({ ...prev, identifier: "" }));
                  }}
                  className={loginErrors.identifier ? "is-invalid" : ""}
                />
              </div>
              {loginErrors.identifier && (
                <div className="invalid-feedback">{loginErrors.identifier}</div>
              )}

              {/* PASSWORD */}
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={loginErrors.password ? "is-invalid" : ""}
                />
              </div>
              {loginErrors.password && (
                <div className="invalid-feedback">{loginErrors.password}</div>
              )}

              {/* RECORDARME */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 380,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                <label
                  htmlFor="rememberMe"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Recordarme</span>
                </label>
              </div>

              <button type="submit" className="btns">
                Iniciar sesión
              </button>
            </form>

            {/* ---------- SIGN-UP FORM ---------- */}
            <form className="sign-up-form" onSubmit={handleRegister} noValidate>
              <figure style={{ marginBottom: "1rem" }}>
                <img className="logo" src="/img/logo-2.svg" alt="Vinci logo" />
              </figure>

              <h2 className="title">Crear cuenta</h2>
              <p style={{ marginBottom: "1rem", textAlign: "center" }}>
                Unite a Vinci, subí tus proyectos y encontrá colaboradores
                dentro de la comunidad.
              </p>

              {regErrors.general && (
                <div className="alert alert-danger">{regErrors.general}</div>
              )}

              {/* USERNAME */}
              <div className="input-field">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    setRegErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  className={regErrors.username ? "is-invalid" : ""}
                />
              </div>
              {regErrors.username && (
                <div className="invalid-feedback">{regErrors.username}</div>
              )}

              {/* EMAIL */}
              <div className="input-field">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  placeholder="Email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={regErrors.email ? "is-invalid" : ""}
                />
              </div>
              {regErrors.email && (
                <div className="invalid-feedback">{regErrors.email}</div>
              )}

              {/* PASSWORD */}
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setRegErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={regErrors.password ? "is-invalid" : ""}
                />
              </div>
              {regErrors.password && (
                <div className="invalid-feedback">{regErrors.password}</div>
              )}

              <button type="submit" className="btns" disabled={regLoading}>
                {regLoading ? "Creando..." : "Registrarme"}
              </button>
            </form>
          </div>
        </div>

        {/* ====== PANELES LATERALES ====== */}
        <div className="panels-container">
          {/* Panel izquierdo: invita a registrarse */}
          <div className="panel left-panel">
            <div className="content">
              <h3>¿Nueva por acá?</h3>
              <p>
                Unite a Vinci, compartí tus proyectos, buscá colaboradores y
                conectá con otros estudiantes.
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={handleGoToRegister}
              >
                Crear cuenta
              </button>
            </div>
            <img src="/img/login.svg" className="image" alt="Login" />
          </div>

          {/* Panel derecho: invita a iniciar sesión */}
          <div className="panel right-panel">
            <div className="content">
              <h3>¿Ya tenés cuenta?</h3>
              <p>
                Volvé a tus proyectos, respondé solicitudes y seguí construyendo
                tu espacio dentro de Vinci.
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={() => setIsSignUpMode(false)}
              >
                Iniciar sesión
              </button>
            </div>
            <img src="/img/reg.svg" className="image" alt="Registro" />
          </div>
        </div>
      </div>
    </main>
  );
}
