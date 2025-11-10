# Guía de producto y desarrollo – Vinci-App

## 1. Propósito del Proyecto
Qué es Vinci-App y para quién

Vinci-App es una red social educativa diseñada para estudiantes de la Escuela Multimedial Da Vinci, integrando a quienes cursan Diseño, Ilustración, Videojuegos, Programación, Cine, y otras carreras afines.

### Objetivos del producto

- Conectarse entre carreras.

- Compartir proyectos y recursos.

- Pedir ayuda y feedback.

- Encontrar colaboradores y formar equipos.

Comparación breve (Fandom/Reddit vs Vinci)
| Tomamos                                                             | No tomamos                                 |
| ------------------------------------------------------------------- | ------------------------------------------ |
| Estructura tipo “saga” (cada carrera con su propia página).         | Hilos infinitos o subreddits fragmentados. |
| Layout de tres columnas, actividad por categoría, navegación clara. | Moderación comunitaria compleja o karma.   |
| Jerarquía visual simple y escaneable.                               | Comunidad abierta sin foco educativo.      |

## 2. Visión General del Producto
### Arquitectura de navegado

 * #### Feed global (Home)

* Muestra toda la actividad de todas las carreras.

* No permite publicar.

* Sí permite likes y comentarios.

* #### Páginas por carrera (layout de tres columnas)

* Composer en dos pasos (contenido → categoría).

* Filtros por categoría (contadores actualizados en vivo).

* Panel de actividad en vivo (última actividad, conteos, avatares).

* #### Interacciones sociales actuales y por etapas

* Likes.

* Comentarios.

* Buscador (roadmap).

* Matching y chat en tiempo real (etapas futuras).

## 3. Qué ya hicimos (logros por áreas)
#### Backend / Modelo de datos

* Usuarios pueden pertenecer a una o varias carreras.

* Categorías alineadas a UX: comunidad, colaboradores, ayuda, feedback, ideas.

* Validaciones con Joi para posts y comentarios:

    * categoría válida,

    * degreeId o degreeSlug (mutuamente excluyentes),

    * mensajes de error consistentes para el front.

Endpoints actuales
| Método | Ruta                                        | Descripción                                                |
| ------ | ------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/meta/categories`                      | Lista de categorías disponibles.                           |
| GET    | `/api/posts/degree/:slug`                   | Feed de posts de una carrera.                              |
| GET    | `/api/posts/degree/:slug/category-stats`    | Contadores por categoría.                                  |
| GET    | `/api/posts/degree/:slug/category-activity` | Actividad: conteo, última vez, hasta 3 avatares recientes. |
| GET    | `/api/links/preview?url=...`                | Preview Open Graph + favicon fallback.                     |


#### Notas:

* createPost devuelve author y degree poblados para actualizar el front en vivo.

### Frontend (React)

* Layout estilo Fandom mediante ThreeColumnLayout (izq / centro / der).

* #### Página de Carrera:

    * Top bar con flecha a Home + logo VINCI centrado.

    * Composer en 2 pasos:

        #### 1.  título, descripción, adjuntos (img/PDF), links con preview;

        #### 2. categoría y publicar.

    * Filtro por categoría (contadores en vivo, colapsable).

    * Actividad por categoría en la columna izquierda (última vez + avatares).

* #### Home:

    * Feed global sin publicación.

    * Likes y comentarios habilitados.

### Actualizaciones en vivo

* Uso combinado de CustomEvent, BroadcastChannel y localStorage para sincronizar películas, actividad y filtros sin recargar.

### UI/UX y detalles

* Logo en /img/logo-2.svg.

* Composer colapsado (“¿Qué estás pensando?”).

* Filtros colapsables para mobile.

* Ajustes de columnas y CSS para responsividad.

## 4. Roadmap – Capa Social
### Día 4 en adelante: Notificaciones en vivo
Modelo notifications
{
  "_id": "string",
  "user": "userId",
  "type": "like | comment | match",
  "data": {},
  "read": false,
  "createdAt": "date"
}


### Disparadores

* Like a tu post.

* Comentario en tu post.

* Match.

Endpoints
| Método | Ruta                         | Descripción                 |
| ------ | ---------------------------- | --------------------------- |
| GET    | `/notifications?unread=true` | Últimas 20 no leídas.       |
| PUT    | `/notifications/:id/read`    | Marcar una notificación.    |
| PUT    | `/notifications/read-all`    | Marcar todas.               |
| GET    | `/notifications/stream`      | SSE (alternativa: polling). |

### Frontend

* Campanita con badge.

* Dropdown con últimas notificaciones.

* SSE o polling cada 10–15s.

### Listo cuando

* ⬜ Badge refleja cantidad real.

* ⬜ Dropdown muestra últimas 20.

* ⬜ Eventos SSE/polling actualizan en tiempo real.

* ⬜ Leer marca correctamente y actualiza badge.

### Chat en tiempo real (MVP, Día 5–6)
#### Modelos
// conversations
{
  "_id": "string",
  "isGroup": false,
  "members": ["userId", "userId"],
  "degree": "optional"
}

// messages
{
  "_id": "string",
  "conversationId": "string",
  "senderId": "string",
  "text": "string",
  "attachments": [],
  "createdAt": "date"
}

Endpoints
| Método | Ruta                                   | Descripción                        |
| ------ | -------------------------------------- | ---------------------------------- |
| POST   | `/conversations`                       | Crear conversación.                |
| GET    | `/conversations`                       | Listar conversaciones del usuario. |
| GET    | `/conversations/:id/messages?after=ts` | Traer mensajes.                    |
| POST   | `/messages`                            | Enviar mensaje.                    |

### Tiempo real

* SSE por conversación (simple) o WebSocket.

### Frontend

* Widget “Chat de la carrera” (columna derecha).

* Página completa de “Mensajes”.

### Listo cuando

* ⬜ Enviar/recibir sin recargar.

* ⬜ Historial carga por paginación o after.

* ⬜ SSE/WebSocket empuja nuevos mensajes.

## Buscador (Día 7–8)
### Endpoint

GET /search?query=&degree=&category=&author=&limit=&page=

### Índices recomendados

* posts(title, content, degree, category, createdAt)

* Opcional: índice $text.

### Frontend

* Caja de búsqueda en Home y Carrera.

* Chips de filtros + paginación.

### Listo cuando

* ⬜ Busca por texto.

* ⬜ Filtra por carrera y categoría.

* ⬜ Paginación fluida.

## Matching de proyectos (Día 9–10)
### Extensión de posts/projects
{
  "isProject": true,
  "rolesWanted": ["3D", "Frontend", "Sonido"],
  "status": "open"
}

### Matches
{
  "_id": "string",
  "projectPostId": "string",
  "ownerId": "string",
  "candidateId": "string",
  "status": "pending | accepted",
  "createdAt": "date"
}

### Flujo

Interés → aceptación mutua → crear conversation → notificación “match”.

### Frontend

* Botón “Me interesa” / “Retirar interés”.

* Lista de interesados.

* Abrir chat tras match.

### Listo cuando

* ⬜ Intereses se guardan.

* ⬜ Owner acepta/rechaza.

* ⬜ Se crea chat automático.

* ⬜ Notificación se dispara.

## Perfil editable (Día 11)
### Endpoint

PUT /users/me
Campos: bio, intereses, links, avatar, portada.

### Frontend

* Página “Editar Perfil”.

* Preview antes de guardar.

### Listo cuando

* ⬜ Edición completa.

* ⬜ Validaciones UX claras.

* ⬜ Previews funcionan.

## Moderación y reportes (Día 12)
Endpoints
| Método | Ruta                   | Descripción             |
| ------ | ---------------------- | ----------------------- |
| POST   | `/reports`             | Crear reporte.          |
| GET    | `/reports`             | Listar (admin).         |
| PUT    | `/reports/:id/resolve` | Resolver reporte.       |
| PUT    | `/posts/:id/flag`      | Marcar/ocultar (admin). |

### Frontend

* Botón “Reportar”.

* Panel administrador.

### Listo cuando

* ⬜ Flujo completo de reportes.

* ⬜ Admin puede resolver.

* ⬜ Rate limiting aplicado.

## Performance & DX (Día 13)

* Paginación real.

* Lazy-loading.

* Cache (SWR).

* Compresión, Helmet, CORS.

* Logs y métricas.

### Listo cuando

* ⬜ Home y Carrera cargan < 200ms desde API local.

* ⬜ Sin bloqueos de render.

* ⬜ Paginación estable.

## QA, Accesibilidad y Entrega (Día 14)
### Checklist QA

* ⬜ Labels, roles y foco visibles.

* ⬜ Contraste AA.

* ⬜ Alt en imágenes.

* ⬜ Estados vacíos claros.

* ⬜ Toasts consistentes.

* ⬜ Mobile 360×640 y 414×896.

* ⬜ Seeds para dev.

* ⬜ README: setup, .env, rutas API, roles, capturas, despliegue.

### Listo cuando

* Demo 3–5 minutos sin bloqueos.

## 5. Guías de desarrollo (coding standards)
### JSDoc obligatorio

Cada función nueva debe incluir JSDoc con:

* descripción,

* params,

* returns,

* ejemplos si aplica.

### Convenciones

* camelCase / PascalCase según contexto.

* Carpetas separadas por dominio: controllers, models, routes, utils.

* Manejo de errores consistente.

* Mensajes de validación claros para UX.

### SSE vs WebSocket

* **SSE** para notificaciones y feeds unidireccionales.

* **WebSocket** para chat o casos full-duplex.

### Estrategia de actualización en vivo

* CustomEvent para componentes.

* BroadcastChannel para tabs.

* localStorage para flags ligeros.

## 6. Anexos de referencia
Tabla de categorías
| Categoría     | Uso esperado                           |
| ------------- | -------------------------------------- |
| comunidad     | Presentaciones, discusiones generales. |
| colaboradores | Búsqueda de equipo.                    |
| ayuda         | Dudas puntuales.                       |
| feedback      | Críticas y revisiones.                 |
| ideas         | Conceptos iniciales, brainstorming.    |

### Ejemplos de payloads
Crear post
{
  "title": "Busco animador 2D",
  "content": "Proyecto corto para final de semestre.",
  "degreeSlug": "diseno-multimedial",
  "category": "colaboradores",
  "attachments": []
}

### Notificación
{
  "type": "comment",
  "data": { "postId": "123" },
  "read": false
}

### Mensaje
{
  "conversationId": "abc",
  "text": "Hola, ¿te interesa colaborar?",
  "attachments": []
}

### Glosario

* **composer**: módulo para crear posts.

* **saga/carrera**: sección temática por carrera.

* **actividad por categoría**: panel con últimos movimientos.

* **match**: coincidencia entre proyecto y colaborador.