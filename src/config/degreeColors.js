export const DEGREE_COLORS = {
  'diseño multimedial': '#FFD600',      // Amarillo
  'diseño gráfico': '#FF6B6B',          // Rosa
  'diseño de videojuegos': '#4D96FF',   // Azul
  'cine de animación': '#6BCB77',       // Verde
  'diseño web': '#9D4EDD',              // Violeta
  'analista de sistemas': '#FF4757',    // Rojo
  'cine y nuevos formatos': '#FF9F43'   // Naranja
};

// Función auxiliar para obtener color (útil para el controlador al crear)
export const getColorForDegree = (name) => {
  const normalizedKey = name.toLowerCase().trim();
  // Busca por clave exacta o parcial
  const foundKey = Object.keys(DEGREE_COLORS).find(k => normalizedKey.includes(k));
  return foundKey ? DEGREE_COLORS[foundKey] : '#000000'; // Fallback negro
};