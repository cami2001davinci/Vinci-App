import Joi from 'joi';
import { isBefore, subYears } from 'date-fns';


const objectId = Joi.string().hex().length(24);


export const userRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  // role: Joi.string().valid('user', 'admin').default('user'),
   degrees: Joi.alternatives()
    .try(Joi.array().items(objectId).min(1).unique(), objectId)
    .custom((value, helpers) => {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) return helpers.error('array.min');
      if (new Set(arr).size !== arr.length) {
        return helpers.message('No se permiten ids de carreras duplicados');
      }
      return arr; // <- siempre un array válido
    }),
  birthDate: Joi.date()
    .iso()
    .required()
    .custom((value, helpers) => {
      const minDate = subYears(new Date(), 18);
      if (!isBefore(value, minDate)) {
        return helpers.message('Debes tener al menos 18 años');
      }
      return value;
    }),
});

export const userUpdateSchema = Joi.object({
  degrees: Joi.alternatives()
    .try(Joi.array().items(objectId).min(1).unique(), objectId)
    .custom((value, helpers) => {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.length === 0) return helpers.error('array.min');
      if (new Set(arr).size !== arr.length) {
        return helpers.message('No se permiten ids de carreras duplicados');
      }
      return arr; // <- queda como array si lo mandan
    }),
  }).prefs({ convert: true });


export const userLoginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .custom((value, helpers) => {
      const isEmail = /^\S+@\S+\.\S+$/.test(value);
      const isUsername = /^[a-zA-Z0-9._-]+$/.test(value); // reglas para nombres de usuario
      if (!isEmail && !isUsername) {
        return helpers.message('Debe ingresar un email válido o un nombre de usuario válido');
      }
      return value;
    }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.empty': 'La contraseña es obligatoria',
    'any.required': 'La contraseña es obligatoria'
  })
});
