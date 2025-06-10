import Joi from 'joi';
export const createPostSchema = Joi.object({
  content: Joi.string()
    .min(10)
    .max(3000)
    .required()
    .messages({
      'string.empty': 'El contenido es obligatorio',
      'string.min': 'El contenido debe tener al menos 10 caracteres',
      'string.max': 'El contenido no puede superar los 3000 caracteres',
    }),
  category: Joi.string()
    .valid(
      'dudas_tecnicas',
      'feedback_proyectos',
      'inspiracion_referencias',
      'buscar_colaboradores',
      'comunidad_general'
    )
    .required()
    .messages({
      'any.only': 'Categoría no válida',
      'string.empty': 'La categoría es obligatoria'
    })
});

export const createCommentSchema = Joi.object({
  postId: Joi.string().required().messages({
    'any.required': 'El ID del post es obligatorio',
    'string.empty': 'El ID del post es obligatorio',
  }),
  content: Joi.string()
    .min(3)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'El comentario no puede estar vacío',
      'string.min': 'El comentario es demasiado corto',
      'string.max': 'El comentario es demasiado largo'
    })
});
