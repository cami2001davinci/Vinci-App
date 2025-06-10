// src/pages/Construccion.jsx
import { Link } from 'react-router-dom';

export default function Construccion() {
  return (
    <div className="container mt-5 text-center">
      <h1>🚧 Sitio en construcción 🚧</h1>
      <p>Estamos trabajando para brindarte una mejor experiencia. ¡Gracias por tu paciencia!</p>
      <Link to="/" className="btn btn-secondary mt-4">
        Volver al inicio
      </Link>
    </div>
  );
}
