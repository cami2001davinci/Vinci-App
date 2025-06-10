import fs from 'fs';
import path from 'path';
import leoProfanity from 'leo-profanity';

leoProfanity.loadDictionary('es');

// Lista personalizada
const blacklistPath = path.resolve('src/utils/blacklist.json');
let customBlacklist = [];

try {
  const data = fs.readFileSync(blacklistPath, 'utf-8');
  const json = JSON.parse(data);
  customBlacklist = json.prohibited.map(w => w.toLowerCase());
} catch (err) {
  console.error('Error cargando blacklist personalizada:', err);
}

// Función combinada
const contienePalabrasProhibidas = (text) => {
  const lower = text.toLowerCase();
  const palabras = lower.split(/\s+/);
  return (
    leoProfanity.check(text) ||
    palabras.some(p => customBlacklist.includes(p))
  );
};

export const validateContentOnSave = function (next) {
  const { content, title } = this;

  if (content && contienePalabrasProhibidas(content)) {
    return next(new Error('El contenido contiene lenguaje prohibido.'));
  }

  if (title && contienePalabrasProhibidas(title)) {
    return next(new Error('El título contiene lenguaje prohibido.'));
  }

  next();
};

export const validateContentOnUpdate = function (next) {
  const update = this.getUpdate();
  const content = update.content || (update.$set && update.$set.content);
  const title = update.title || (update.$set && update.$set.title);

  if (content && contienePalabrasProhibidas(content)) {
    return next(new Error('El contenido actualizado contiene lenguaje prohibido.'));
  }

  if (title && contienePalabrasProhibidas(title)) {
    return next(new Error('El título actualizado contiene lenguaje prohibido.'));
  }

  next();
};
