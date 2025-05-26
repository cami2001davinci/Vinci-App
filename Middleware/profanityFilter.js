import leoProfanity from 'leo-profanity';

// Cargar diccionario en español
leoProfanity.loadDictionary('es');

// Middleware para .save()
export const validateContentOnSave = function (next) {
  const content = this.content;
  const title = this.title;

  // Usar leoProfanity.check para detectar palabras ofensivas
  if (content && leoProfanity.check(content)) {
    return next(new Error('El contenido contiene lenguaje inapropiado.'));
  }

  if (title && leoProfanity.check(title)) {
    return next(new Error('El título contiene lenguaje inapropiado.'));
  }

  next();
};

// Middleware para .findOneAndUpdate(), .updateOne(), etc.
export const validateContentOnUpdate = function (next) {
  const update = this.getUpdate();

  // Soporta sintaxis plana y con operadores ($set)
  const content = update.content || (update.$set && update.$set.content);
  const title = update.title || (update.$set && update.$set.title);

  if (content && leoProfanity.check(content)) {
    return next(new Error('El contenido actualizado contiene lenguaje inapropiado.'));
  }

  if (title && leoProfanity.check(title)) {
    return next(new Error('El título actualizado contiene lenguaje inapropiado.'));
  }

  next();
};
