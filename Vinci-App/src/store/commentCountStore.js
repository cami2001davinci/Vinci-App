// src/store/commentCountStore.js

const listeners = new Map();   // postId -> Set(callbacks)
const counts = new Map();      // postId -> number

export const CommentCountStore = {
  /** Guarda el número real de comentarios raíz */
  setCount(postId, value) {
    counts.set(postId, value);
    this._emit(postId);
  },

  /** Incrementar solo si el comentario es raíz */
  increment(postId) {
    const current = counts.get(postId) ?? 0;
    counts.set(postId, current + 1);
    this._emit(postId);
  },

  /** Decrementar contador para ese post */
  decrement(postId) {
    const current = counts.get(postId) ?? 1;
    counts.set(postId, Math.max(current - 1, 0));
    this._emit(postId);
  },

  /** Obtener el valor actual */
  getCount(postId) {
    return counts.get(postId) ?? 0;
  },

  /** Suscribir un componente a este post */
  subscribe(postId, callback) {
    if (!listeners.has(postId)) {
      listeners.set(postId, new Set());
    }
    listeners.get(postId).add(callback);

    // 👇 ESTA ES LA CORRECCIÓN CLAVE (BUENA PRÁCTICA)
    // Devolvemos una función que el useEffect llamará al desmontar
    return () => {
      this.unsubscribe(postId, callback);
    };
  },

  /** Desuscribir cuando el componente se desmonta */
  unsubscribe(postId, callback) {
    const postListeners = listeners.get(postId);
    if (postListeners) {
      postListeners.delete(callback); // Borra el callback
      
      // OPTIMIZACIÓN DE MEMORIA:
      // Si ya nadie escucha este post, borramos la entrada del mapa
      if (postListeners.size === 0) {
        listeners.delete(postId);
      }
    }
  },

  /** Notificar cambios a todos los suscriptores */
  _emit(postId) {
    const subs = listeners.get(postId);
    if (!subs) return;
    const value = counts.get(postId);
    for (const cb of subs) cb(value);
  }
};
