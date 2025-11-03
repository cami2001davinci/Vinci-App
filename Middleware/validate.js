// export const validateBody = (schema) => (req, res, next) => {
//   const { error } = schema.validate(req.body, { abortEarly: false });
//   if (error) {
//     const errorDetails = error.details.map(d => d.message);
//     return res.status(400).json({ errors: errorDetails });
//   }
//   next();
// };
// Middleware/validate.js
export const validateBody = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,          // <- permite que alternatives() convierta string -> array
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ errors });
  }

  req.body = value;         // <- desde acá en adelante, degrees ya es array válido
  next();
};
