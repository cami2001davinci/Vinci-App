// import { useState, useEffect } from "react";
// import { register } from "../api/auth";
// import { getDegrees } from "../api/degrees";
// import { useNavigate } from "react-router-dom";

// export default function Register() {
//   const [form, setForm] = useState({
//     username: "",
//     email: "",
//     password: "",
//     firstName: "",
//     lastName: "",
//     birthDate: "",
//     degrees: [],        // 👈 carreras seleccionadas (1..N)
//   });

//   const [errors, setErrors] = useState({});
//   const [error, setError] = useState("");
//   const [degreesList, setDegreesList] = useState([]);   // catálogo de carreras
//   const [pick, setPick] = useState("");                 // valor actual del select para "agregar"
//   const navigate = useNavigate();

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await getDegrees();
//         setDegreesList(res.data || []);
//       } catch (err) {
//         console.error("Error al cargar carreras:", err);
//       }
//     })();
//   }, []);

//   const handleField = (e) => {
//     const { name, value } = e.target;
//     setForm((f) => ({ ...f, [name]: value }));
//     setErrors((prev) => ({ ...prev, [name]: "" }));
//     setError("");
//   };

//   // Opciones que aún no están seleccionadas
//   const remainingOptions = degreesList.filter(
//     (d) => !form.degrees.includes(d._id)
//   );

//   const handleAddDegree = () => {
//     if (!pick) return;
//     if (form.degrees.includes(pick)) return; // por si acaso

//     const updated = [...form.degrees, pick];
//     setForm((f) => ({ ...f, degrees: updated }));
//     setPick("");
//     setErrors((prev) => ({ ...prev, degrees: "" }));
//     setError("");
//   };

//   const handleRemoveDegree = (id) => {
//     const updated = form.degrees.filter((d) => d !== id);
//     setForm((f) => ({ ...f, degrees: updated }));
//     setErrors((prev) => ({ ...prev, degrees: updated.length ? "" : prev.degrees }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const newErrors = {};

//     if (!form.username) newErrors.username = "El nombre de usuario es obligatorio";
//     if (!form.email) newErrors.email = "El correo electrónico es obligatorio";
//     else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "El correo electrónico no es válido";

//     if (!form.password) newErrors.password = "La contraseña es obligatoria";
//     else if (form.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres";

//     if (!form.firstName) newErrors.firstName = "El nombre es obligatorio";
//     if (!form.lastName) newErrors.lastName = "El apellido es obligatorio";

//     if (!form.birthDate) {
//       newErrors.birthDate = "La fecha de nacimiento es obligatoria";
//     } else {
//       const birth = new Date(form.birthDate);
//       const today = new Date();
//       let age = today.getFullYear() - birth.getFullYear();
//       const m = today.getMonth() - birth.getMonth();
//       if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
//       if (isNaN(birth.getTime())) newErrors.birthDate = "Fecha de nacimiento inválida";
//       else if (age < 18) newErrors.birthDate = "Debes tener al menos 18 años";
//     }

//     if (!form.degrees || form.degrees.length === 0) {
//       newErrors.degrees = "Seleccioná al menos una carrera";
//     }

//     setErrors(newErrors);
//     if (Object.keys(newErrors).length > 0) return;

//     try {
//       const payload = {
//         username: form.username.trim().toLowerCase(),
//         email: form.email.trim().toLowerCase(),
//         password: form.password,
//         firstName: form.firstName.trim(),
//         lastName: form.lastName.trim(),
//         birthDate: form.birthDate,           // YYYY-MM-DD
//         degrees: form.degrees,               // 👈 array 1..N (ObjectIds)
//         interests: [],
//         bio: "",
//         lookingForCollab: false,
//       };

//       await register(payload);
//       navigate("/login");
//     } catch (err) {
//       console.error(err);
//       if (err.response?.data?.message) {
//         const msg = err.response.data.message;
//         if (msg.toLowerCase().includes("faltan campos")) {
//           setError("Faltan campos obligatorios. Revisá los datos y las carreras.");
//           if (!form.degrees?.length) setErrors((p) => ({ ...p, degrees: "Seleccioná al menos una carrera" }));
//         } else {
//           setError(msg);
//         }
//       } else {
//         setError("Error al registrar usuario. Inténtalo más tarde.");
//       }
//     }
//   };

//   const getMarginClass = () => "mb-1";

//   return (
//     <main className="register-page">
//       <section className="register-heading" aria-labelledby="login-heading">
//         <figure className="register">
//           <img className="logo logo-register" src="/img/logo-2.svg" alt="" />
//         </figure>

//         <form onSubmit={handleSubmit} className="container" noValidate>
//           <h1>Registrarse</h1>
//           {error && <div className="alert alert-danger">{error}</div>}

//           <div className="form-grid">
//             {/* Username */}
//             <div className={getMarginClass("username")}>
//               <label htmlFor="username" className="visually-hidden">Nombre de usuario</label>
//               <input
//                 id="username"
//                 className={`form-control ${errors.username ? "is-invalid" : ""}`}
//                 name="username"
//                 placeholder="Nombre de usuario"
//                 value={form.username}
//                 onChange={handleField}
//               />
//               {errors.username && <div className="invalid-feedback">{errors.username}</div>}
//             </div>

//             {/* Email */}
//             <div className={getMarginClass("email")}>
//               <label htmlFor="email" className="visually-hidden">Correo electrónico</label>
//               <input
//                 id="email"
//                 className={`form-control ${errors.email ? "is-invalid" : ""}`}
//                 name="email"
//                 type="email"
//                 placeholder="Correo electrónico"
//                 value={form.email}
//                 onChange={handleField}
//               />
//               {errors.email && <div className="invalid-feedback">{errors.email}</div>}
//             </div>

//             {/* Password */}
//             <div className={getMarginClass("password")}>
//               <label htmlFor="password" className="visually-hidden">Contraseña</label>
//               <input
//                 id="password"
//                 className={`form-control ${errors.password ? "is-invalid" : ""}`}
//                 name="password"
//                 type="password"
//                 placeholder="Contraseña"
//                 value={form.password}
//                 onChange={handleField}
//               />
//               {errors.password && <div className="invalid-feedback">{errors.password}</div>}
//             </div>

//             {/* Nombre */}
//             <div className={getMarginClass("firstName")}>
//               <label htmlFor="firstName" className="visually-hidden">Nombre</label>
//               <input
//                 id="firstName"
//                 className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
//                 name="firstName"
//                 placeholder="Nombre"
//                 value={form.firstName}
//                 onChange={handleField}
//               />
//               {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
//             </div>

//             {/* Apellido */}
//             <div className={getMarginClass("lastName")}>
//               <label htmlFor="lastName" className="visually-hidden">Apellido</label>
//               <input
//                 id="lastName"
//                 className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
//                 name="lastName"
//                 placeholder="Apellido"
//                 value={form.lastName}
//                 onChange={handleField}
//               />
//               {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
//             </div>

//             {/* Gestor de carreras: select + botón agregar + chips */}
//             <div className={getMarginClass("degrees")}>
//               <label htmlFor="pick" className="form-label">Carreras</label>
//               <div className="d-flex gap-2">
//                 <select
//                   id="pick"
//                   className={`form-control ${errors.degrees ? "is-invalid" : ""}`}
//                   value={pick}
//                   onChange={(e) => setPick(e.target.value)}
//                 >
//                   <option value="">Elegí una carrera</option>
//                   {remainingOptions.map((d) => (
//                     <option key={d._id} value={d._id}>{d.name}</option>
//                   ))}
//                 </select>
//                 <button
//                   type="button"
//                   className="btn-base"
//                   onClick={handleAddDegree}
//                   disabled={!pick}
//                 >
//                   Agregar
//                 </button>
//               </div>
//               {errors.degrees && <div className="invalid-feedback d-block">{errors.degrees}</div>}

//               {/* Chips de seleccionadas */}
//               {form.degrees.length > 0 && (
//                 <ul className="list-unstyled d-flex flex-wrap gap-2 mt-2">
//                   {form.degrees.map((id) => {
//                     const item = degreesList.find((d) => d._id === id);
//                     const label = item ? item.name : id;
//                     return (
//                       <li key={id} className="badge bg-secondary d-flex align-items-center">
//                         <span className="me-2">{label}</span>
//                         <button
//                           type="button"
//                           onClick={() => handleRemoveDegree(id)}
//                           aria-label={`Quitar ${label}`}
//                           className="btn btn-sm btn-light"
//                           style={{ lineHeight: 1 }}
//                         >
//                           ×
//                         </button>
//                       </li>
//                     );
//                   })}
//                 </ul>
//               )}
//               <small className="text-muted">Podés agregar una o varias carreras. Quitá las que no correspondan.</small>
//             </div>

//             {/* Fecha de nacimiento */}
//             <div className={getMarginClass("birthDate")}>
//               <label htmlFor="birthDate" className="form-label">Fecha de nacimiento</label>
//               <input
//                 id="birthDate"
//                 className={`form-control ${errors.birthDate ? "is-invalid" : ""}`}
//                 name="birthDate"
//                 type="date"
//                 value={form.birthDate}
//                 onChange={handleField}
//               />
//               {errors.birthDate && <div className="invalid-feedback">{errors.birthDate}</div>}
//             </div>
//           </div>

//           <button type="submit" className="btn-base btn-register">Registrarse</button>
//         </form>
//       </section>
//     </main>
//   );
// }

import { useState, useEffect } from "react";
import { register } from "../api/auth";
import { getDegrees } from "../api/degrees";
import { useNavigate } from "react-router-dom";
import "../styles/LoginAndRegister.css";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    degrees: [], // carreras seleccionadas (1..N)
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [degreesList, setDegreesList] = useState([]);
  const [pick, setPick] = useState("");
  const [step, setStep] = useState(1); // 1, 2, 3
  const [animBack, setAnimBack] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getDegrees();
        setDegreesList(res.data || []);
      } catch (err) {
        console.error("Error al cargar carreras:", err);
      }
    })();
  }, []);

  

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  // Opciones que aún no están seleccionadas
  const remainingOptions = degreesList.filter(
    (d) => !form.degrees.includes(d._id)
  );

  const handleAddDegree = () => {
    if (!pick) return;
    if (form.degrees.includes(pick)) return;

    const updated = [...form.degrees, pick];
    setForm((f) => ({ ...f, degrees: updated }));
    setPick("");
    setErrors((prev) => ({ ...prev, degrees: "" }));
    setError("");
  };

  const handleRemoveDegree = (id) => {
    const updated = form.degrees.filter((d) => d !== id);
    setForm((f) => ({ ...f, degrees: updated }));
    if (!updated.length) {
      setErrors((prev) => ({
        ...prev,
        degrees: "Seleccioná al menos una carrera",
      }));
    }
  };

  // ---------- Validaciones por paso ----------

  const validateStep1 = () => {
    const newErrors = {};

    if (!form.username)
      newErrors.username = "El nombre de usuario es obligatorio";

    if (!form.email) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "El correo electrónico no es válido";
    }

    if (!form.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (form.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!form.firstName) newErrors.firstName = "El nombre es obligatorio";

    if (!form.lastName) newErrors.lastName = "El apellido es obligatorio";

    if (!form.birthDate) {
      newErrors.birthDate = "La fecha de nacimiento es obligatoria";
    } else {
      const birth = new Date(form.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (isNaN(birth.getTime()))
        newErrors.birthDate = "Fecha de nacimiento inválida";
      else if (age < 18) newErrors.birthDate = "Debes tener al menos 18 años";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return newErrors;
  };

  const validateAll = () => {
    const newErrors = {};

    // Paso 1
    if (!form.username)
      newErrors.username = "El nombre de usuario es obligatorio";
    if (!form.email) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "El correo electrónico no es válido";
    }
    if (!form.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (form.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    // Paso 2
    if (!form.firstName) newErrors.firstName = "El nombre es obligatorio";
    if (!form.lastName) newErrors.lastName = "El apellido es obligatorio";

    if (!form.birthDate) {
      newErrors.birthDate = "La fecha de nacimiento es obligatoria";
    } else {
      const birth = new Date(form.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (isNaN(birth.getTime()))
        newErrors.birthDate = "Fecha de nacimiento inválida";
      else if (age < 18) newErrors.birthDate = "Debes tener al menos 18 años";
    }

    // Paso 3
    if (!form.degrees || form.degrees.length === 0) {
      newErrors.degrees = "Seleccioná al menos una carrera";
    }

    setErrors(newErrors);
    return newErrors;
  };

  // ---------- Navegación entre pasos ----------

  const goNextFromStep1 = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length === 0) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const goNextFromStep2 = (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length === 0) {
      setStep(3);
      window.scrollTo(0, 0);
    }
  };

  const goBack = (e) => {
    e.preventDefault();
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo(0, 0);
  };

  // ---------- Envío final ----------

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateAll();

    if (Object.keys(newErrors).length > 0) {
      // Mandamos a la pantalla donde esté el primer error
      if (newErrors.username || newErrors.email || newErrors.password) {
        setStep(1);
      } else if (
        newErrors.firstName ||
        newErrors.lastName ||
        newErrors.birthDate
      ) {
        setStep(2);
      } else if (newErrors.degrees) {
        setStep(3);
      }
      return;
    }

    try {
      const payload = {
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        degrees: form.degrees,
        interests: [],
        bio: "",
        lookingForCollab: false,
      };

      await register(payload);
      navigate("/login");
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        const msg = err.response.data.message;
        if (msg.toLowerCase().includes("faltan campos")) {
          setError(
            "Faltan campos obligatorios. Revisá los datos y las carreras."
          );
          if (!form.degrees?.length) {
            setErrors((p) => ({
              ...p,
              degrees: "Seleccioná al menos una carrera",
            }));
          }
        } else {
          setError(msg);
        }
      } else {
        setError("Error al registrar usuario. Inténtalo más tarde.");
      }
    }
  };

  // ---------- Wizard: estado visual de cada paso ----------

  const stepStatus = (n) => {
    if (step === n) return "auth-step--active";
    if (step > n) return "auth-step--done";
    return "";
  };

  const handleBackToLogin = () => {
  // Sacamos sign-up-mode para que el círculo vuelva
  setAnimBack(true);

  setTimeout(() => {
    navigate("/login");
  }, 800);
};


  return (
    <main className="register-page">
      <div className={`container ${animBack ? "" : "sign-up-mode"}`}>
        {/* FORMULARIO (lado derecho del layout) */}
        <div className="forms-container">
          <div className="signin-signup">
            <form
              className="sign-up-form"
              onSubmit={handleSubmit}
              noValidate
              aria-labelledby="register-heading"
            >
              <figure style={{ marginBottom: "0.75rem" }}>
                <img
                  className="logo logo-register"
                  src="../public/img/1.png"
                  alt="Vinci logo"
                />
              </figure>

              <h2 id="register-heading" className="title ">
                Crear cuenta
              </h2>

              {/* Wizard de pasos */}
              <div className="auth-steps">
                <div className={`auth-step ${stepStatus(1)}`}>
                  <span className="auth-step-number">1</span>
                  <span className="auth-step-label">Acceso</span>
                </div>
                <div className={`auth-step ${stepStatus(2)}`}>
                  <span className="auth-step-number">2</span>
                  <span className="auth-step-label">Datos personales</span>
                </div>
                <div className={`auth-step ${stepStatus(3)}`}>
                  <span className="auth-step-number">3</span>
                  <span className="auth-step-label">Carreras</span>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 8 }}>
                  {error}
                </div>
              )}

              {/* =============== PASO 1 =============== */}
              {step === 1 && (
                <>
                  <p className="auth-step-text">
                    Empecemos por tus datos de acceso. Vas a usar estos para
                    iniciar sesión en Vinci.
                  </p>

                  {/* Username */}
                  <div className="input-field">
                    <i className="fas fa-user"></i>
                    <input
                      id="username"
                      name="username"
                      placeholder="Nombre de usuario"
                      value={form.username}
                      onChange={handleField}
                      className={errors.username ? "is-invalid" : ""}
                    />
                  </div>
                  {errors.username && (
                    <div className="invalid-feedback">{errors.username}</div>
                  )}

                  {/* Email */}
                  <div className="input-field">
                    <i className="fas fa-envelope"></i>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Correo electrónico"
                      value={form.email}
                      onChange={handleField}
                      className={errors.email ? "is-invalid" : ""}
                    />
                  </div>
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}

                  {/* Password */}
                  <div className="input-field">
                    <i className="fas fa-lock"></i>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Contraseña (mín. 8 caracteres)"
                      value={form.password}
                      onChange={handleField}
                      className={errors.password ? "is-invalid" : ""}
                    />
                  </div>
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}

                  <div className="auth-actions">
                    <button
                      type="button"
                      className="btns"
                      onClick={goNextFromStep1}
                    >
                      Siguiente
                    </button>
                  </div>
                </>
              )}

              {/* =============== PASO 2 =============== */}
              {step === 2 && (
                <>
                  <p className="auth-step-text">
                    Ahora completá tus datos personales para que podamos armar
                    mejor tu perfil.
                  </p>

                  {/* Nombre + Apellido (dos columnas en desktop) */}
                  <div className="auth-row">
                    <div className="auth-col">
                      <div className="input-field">
                        <i className="fas fa-id-card"></i>
                        <input
                          id="firstName"
                          name="firstName"
                          placeholder="Nombre"
                          value={form.firstName}
                          onChange={handleField}
                          className={errors.firstName ? "is-invalid" : ""}
                        />
                      </div>
                      {errors.firstName && (
                        <div className="invalid-feedback">
                          {errors.firstName}
                        </div>
                      )}
                    </div>

                    <div className="auth-col">
                      <div className="input-field">
                        <i className="fas fa-id-card"></i>
                        <input
                          id="lastName"
                          name="lastName"
                          placeholder="Apellido"
                          value={form.lastName}
                          onChange={handleField}
                          className={errors.lastName ? "is-invalid" : ""}
                        />
                      </div>
                      {errors.lastName && (
                        <div className="invalid-feedback">
                          {errors.lastName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fecha de nacimiento con estilo propio */}
                  <div className="auth-field-block">
                    <label htmlFor="birthDate" className="auth-field-label">
                      Fecha de nacimiento
                    </label>
                    <div className="auth-input-shell">
                      <i className="fas fa-calendar-alt auth-input-icon" />
                      <input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        value={form.birthDate}
                        onChange={handleField}
                        className={`auth-input-plain ${
                          errors.birthDate ? "is-invalid" : ""
                        }`}
                      />
                    </div>
                    {errors.birthDate && (
                      <div className="invalid-feedback">{errors.birthDate}</div>
                    )}
                  </div>

                  <div className="auth-actions auth-actions--split">
                    <button
                      type="button"
                      className="btns btn--ghost"
                      onClick={goBack}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="btns"
                      onClick={goNextFromStep2}
                    >
                      Siguiente
                    </button>
                  </div>
                </>
              )}

              {/* =============== PASO 3 =============== */}
              {step === 3 && (
                <>
                  <p className="auth-step-text">
                    Elegí la(s) carrera(s) en las que estás inscripta. Esto nos
                    ayuda a mostrarte los foros y proyectos correctos.
                  </p>

                  {/* Carreras: select + botón AGREGAR */}
                  <div className="auth-field-block">
                    <label htmlFor="pick" className="auth-field-label">
                      Carreras
                    </label>

                    <div className="auth-field-inline">
                      <div className="auth-input-shell">
                        <i className="fas fa-graduation-cap auth-input-icon" />
                        <select
                          id="pick"
                          className={`auth-input-plain ${
                            errors.degrees ? "is-invalid" : ""
                          }`}
                          value={pick}
                          onChange={(e) => setPick(e.target.value)}
                        >
                          <option value="">Elegí una carrera</option>
                          {remainingOptions.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="btns auth-add-btn"
                        onClick={handleAddDegree}
                        disabled={!pick}
                      >
                        Agregar
                      </button>
                    </div>

                    {errors.degrees && (
                      <div className="invalid-feedback d-block">
                        {errors.degrees}
                      </div>
                    )}
                  </div>

                  {/* Chips de carreras seleccionadas */}
                  {form.degrees.length > 0 && (
                    <div className="auth-chips">
                      {form.degrees.map((id) => {
                        const item = degreesList.find((d) => d._id === id);
                        const label = item ? item.name : id;
                        return (
                          <button
                            key={id}
                            type="button"
                            className="auth-chip"
                            onClick={() => handleRemoveDegree(id)}
                            title="Quitar carrera"
                          >
                            <span>{label}</span>
                            <span className="auth-chip-close">×</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="auth-chip-hint">
                    Podés agregar una o varias carreras. Hacé clic en una para
                    quitarla.
                  </div>

                  {/* Botones finales */}
                  <div className="auth-actions auth-actions--split">
                    <button
                      type="button"
                      className="btns btn--ghost"
                      onClick={goBack}
                    >
                      Volver
                    </button>
                    <button type="submit" className="btns">
                      Registrarse
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>

        {/* PANELES LATERALES (layout violeta) */}
        <div className="panels-container">
          <div className="panel left-panel">
            <div className="content">
              <h3>¿Nueva por acá?</h3>
              <p>
                Unite a Vinci, compartí tus proyectos y encontrá colaboradores
                dentro de la comunidad.
              </p>
            </div>
            <img src="/img/login.svg" className="image" alt="Login" />
          </div>

          <div className="panel right-panel">
            <div className="content">
              <h3>¿Ya tenés cuenta?</h3>
              <p>
                Iniciá sesión para volver a tus proyectos, responder solicitudes
                y seguir construyendo tu espacio en Vinci.
              </p>
              <button
  type="button"
  className="btn transparent"
  onClick={handleBackToLogin}
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
