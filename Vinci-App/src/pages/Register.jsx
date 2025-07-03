import { useState, useEffect } from "react";
import { register } from "../api/auth";
import { getDegrees } from "../api/degrees";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    degree: "",
    birthDate: "",
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState(""); // error general de registro
  const [degrees, setDegrees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDegrees = async () => {
      try {
        const res = await getDegrees();
        setDegrees(res.data);
      } catch (err) {
        console.error("Error al cargar carreras:", err);
      }
    };

    fetchDegrees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" }); // limpiar error al escribir
    setError(""); // limpiar error general
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!form.username)
      newErrors.username = "El nombre de usuario es obligatorio";
    if (!form.email) newErrors.email = "El correo electrónico es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "El correo electrónico no es válido";

    if (!form.password) newErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8)
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";

    if (!form.firstName) newErrors.firstName = "El nombre es obligatorio";
    if (!form.lastName) newErrors.lastName = "El apellido es obligatorio";
    if (!form.degree) newErrors.degree = "Debes seleccionar una carrera";

    if (!form.birthDate) {
      newErrors.birthDate = "La fecha de nacimiento es obligatoria";
    } else {
      const birth = new Date(form.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (isNaN(birth.getTime())) {
        newErrors.birthDate = "Fecha de nacimiento inválida";
      } else if (age < 18) {
        newErrors.birthDate = "Debes tener al menos 18 años";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      console.error(err);

      if (err.response && err.response.status === 409) {
        // Mostrar mensaje personalizado si ya existe usuario o email
        setError(
          err.response.data.message ||
            "El nombre de usuario o correo ya está registrado"
        );
      } else {
        setError("Error al registrar usuario. Inténtalo más tarde.");
      }
    }
  };

  // 🔧 Utilidad para márgenes dinámicos
  const getMarginClass = (field) => (errors[field] ? "mb-1" : "mb-3");

  return (
    <main className="register-page">
      <section className="register-heading" aria-labelledby="login-heading">
        <figure className="register">
          <img className="logo logo-register" src="/img/logo-2.svg" alt="" />
        </figure>
        <form onSubmit={handleSubmit} className="container" noValidate>
          <h1>Registrarse</h1>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-grid">
            <div className={getMarginClass("username")}>
              <input
                className={`form-control ${
                  errors.username ? "is-invalid" : ""
                }`}
                name="username"
                placeholder="Nombre de usuario"
                value={form.username}
                onChange={handleChange}
              />
              {errors.username && (
                <div className="invalid-feedback">{errors.username}</div>
              )}
            </div>

            <div className={getMarginClass("email")}>
              <input
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                name="email"
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email}</div>
              )}
            </div>

            <div className={getMarginClass("password")}>
              <input
                className={`form-control ${
                  errors.password ? "is-invalid" : ""
                }`}
                name="password"
                type="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && (
                <div className="invalid-feedback">{errors.password}</div>
              )}
            </div>

            <div className={getMarginClass("firstName")}>
              <input
                className={`form-control ${
                  errors.firstName ? "is-invalid" : ""
                }`}
                name="firstName"
                placeholder="Nombre"
                value={form.firstName}
                onChange={handleChange}
              />
              {errors.firstName && (
                <div className="invalid-feedback">{errors.firstName}</div>
              )}
            </div>

            <div className={getMarginClass("lastName")}>
              <input
                className={`form-control ${
                  errors.lastName ? "is-invalid" : ""
                }`}
                name="lastName"
                placeholder="Apellido"
                value={form.lastName}
                onChange={handleChange}
              />
              {errors.lastName && (
                <div className="invalid-feedback">{errors.lastName}</div>
              )}
            </div>

            <div className={getMarginClass("degree")}>
              <select
                className={`form-control ${errors.degree ? "is-invalid" : ""}`}
                name="degree"
                value={form.degree}
                onChange={handleChange}
              >
                <option value="">Seleccioná una carrera</option>
                {degrees.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.degree && (
                <div className="invalid-feedback">{errors.degree}</div>
              )}
            </div>

            <div className={getMarginClass("birthDate")}>
              <input
                className={`form-control ${
                  errors.birthDate ? "is-invalid" : ""
                }`}
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={handleChange}
              />
              {errors.birthDate && (
                <div className="invalid-feedback">{errors.birthDate}</div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-base btn-register">
            Registrarse
          </button>
        </form>
      </section>
    </main>
  );
}
