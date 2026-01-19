// src/pages/Welcome.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function Welcome() {
  const [panelVisible, setPanelVisible] = useState(false);
  const navigate = useNavigate();

  // Hace que el panel blanco aparezca con una transición suave
  useEffect(() => {
    const t = setTimeout(() => setPanelVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="welcome-page">
      {/* Fondo con el patrón de iconos */}
      <div className="welcome-bg" />

      {/* Panel blanco con transición */}
      <section
        className={
          "welcome-panel" + (panelVisible ? " welcome-panel--visible" : "")
        }
      >
        <img
  src="/img/1.png"
  alt="Logo Vinci App"
  className="welcome-logo"
/>

        <h1 className="welcome-title">Bienvenido</h1>

        <p className="welcome-subtitle">
          Descubrí un espacio para compartir proyectos, conectarte con otros
          estudiantes y encontrar colaboradores.
        </p>

        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-btn welcome-btn--primary"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            className="welcome-btn welcome-btn--secondary"
            onClick={() => navigate("/register")}
          >
            Registrarse
          </button>
        </div>
      </section>
    </main>
  );
}
