// C:\Vinci-App\validations\postAndCommentValidation.js
import Joi from 'joi';
import categories from '../src/config/categories.js'; // <- ajusta si tu config está en otro lugar

const CATEGORY_KEYS = categories.map(c => c.key);

export const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.empty': 'El título es obligatorio',
    'any.required': 'El título es obligatorio',
    'string.min': 'El título debe tener al menos 3 caracteres',
    'string.max': 'El título no puede superar los 100 caracteres',
  }),
  content: Joi.string().min(10).max(3000).required().messages({
    'string.empty': 'La descripción es obligatoria',
    'any.required': 'La descripción es obligatoria',
    'string.min': 'La descripción debe tener al menos 10 caracteres',
    'string.max': 'La descripción no puede superar los 3000 caracteres',
  }),
  category: Joi.string().valid(...CATEGORY_KEYS).required().messages({
    'any.only': 'La categoría no es válida',
    'string.empty': 'La categoría es obligatoria',
    'any.required': 'La categoría es obligatoria',
  }),
  links: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required().messages({
        'string.uri': 'El link debe ser una URL válida (http o https)',
        'any.required': 'Falta la URL del link',
      }),
      provider: Joi.string().allow(''),
      preview: Joi.object({
        title: Joi.string().allow(''),
        description: Joi.string().allow(''),
        image: Joi.string().uri().allow(''),
      }).default({}),
    })
  ).default([]),
  toolsUsed: Joi.array().items(Joi.string().valid(
    'Photoshop','Illustrator','Figma','Blender','Maya',
    'AfterEffects','Premiere','Procreate','ClipStudio',
    'Unity','Unreal'
  )).default([]),
  degreeSlug: Joi.string().trim(),
  degreeId: Joi.string().length(24).hex(),
}).xor('degreeId', 'degreeSlug');

export const createCommentSchema = Joi.object({
  postId: Joi.string().length(24).hex().required().messages({
    'any.required': 'El ID del post es obligatorio',
    'string.empty': 'El ID del post es obligatorio',
    'string.length': 'El ID del post es inválido',
    'string.hex': 'El ID del post es inválido',
  }),
  content: Joi.string().min(3).max(1000).required().messages({
    'string.empty': 'El comentario no puede estar vacío',
    'string.min': 'El comentario es demasiado corto',
    'string.max': 'El comentario es demasiado largo',
  }),
  parentComment: Joi.string().length(24).hex().optional().messages({
    'string.length': 'El ID del comentario padre es inválido',
    'string.hex': 'El ID del comentario padre es inválido',
  }),
});
