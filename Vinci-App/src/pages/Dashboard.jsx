// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="container mt-5">
      <h2>Bienvenido, {user?.id}</h2>
      <button className="btn btn-danger mt-3" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
