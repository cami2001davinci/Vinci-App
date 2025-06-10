import { useState } from 'react';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';




export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

   useEffect(() => {
    const stored = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(stored);
  }, []);

  // ✅ Guardar preferencia si se marca o desmarca
  useEffect(() => {
    localStorage.setItem('rememberMe', rememberMe);
  }, [rememberMe]);

  const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!email) newErrors.email = 'El email es obligatorio';
    else if (!validarEmail(email)) newErrors.email = 'Email inválido';

    if (!password) newErrors.password = 'La contraseña es obligatoria';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await loginRequest({ email: email.trim(), password: password.trim() });

      login(res.data.token, rememberMe);


      if (res.data.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/construction');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);

      if (err.response?.status === 401) {
        const msg = err.response.data.message || '';
        if (msg.toLowerCase().includes('contraseña')) {
          setErrors({ password: 'Contraseña incorrecta' });
        } else if (msg.toLowerCase().includes('email')) {
          setErrors({ email: 'No existe una cuenta con este email' });
        } else {
          setErrors({ general: 'Email o contraseña incorrectos' });
        }
      } else {
        setErrors({ general: 'Error del servidor. Intentalo más tarde.' });
      }
    }
  };

  return (
    <form onSubmit={handleLogin} className="container mt-5" noValidate>
      <h2 className="mb-4">Iniciar sesión</h2>

      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <div className="mb-3">
        <input
          type="email"
          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: '' });
          }}
        />
        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
      </div>

      <div className="mb-3">
        <input
          type="password"
          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors({ ...errors, password: '' });
          }}
        />
        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
      </div>

      <div className="form-check mb-3">
  <input
    type="checkbox"
    className="form-check-input"
    id="rememberMe"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  <label className="form-check-label" htmlFor="rememberMe">
    Recordarme
  </label>
</div>

      <button type="submit" className="btn btn-primary">
        Iniciar sesión
      </button>
    </form>
  );
}
