export const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map(d => d.message);
    return res.status(400).json({ errors: errorDetails });
  }
  next();
};
