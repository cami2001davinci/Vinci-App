// src/pages/Home.jsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container mt-2">
      <nav className="navbar navbar-light bg-light justify-content-between">
        <a className="navbar-brand">VINCI</a>
        <div>
          <Link to="/login" className="btn btn-outline-primary me-2">Iniciar sesión</Link>
          <Link to="/register" className="btn btn-outline-secondary">Registrarse</Link>
        </div>
      </nav>

      <div className="mt-5 text-center">
        <h1>Bienvenido a VINCI</h1>
        <p>Explorá nuestras funciones, ¡iniciá sesión o registrate!</p>
      </div>
    </div>
  );
}
