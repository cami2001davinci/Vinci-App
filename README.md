# VINCI

**VINCI** es una aplicación web pensada y diseñada para los alumnos de la **Escuela Da VINCI**. Su objetivo es ofrecer un espacio digital donde los estudiantes puedan compartir ideas, colaborar en proyectos, enterarse de eventos y expresar su creatividad, replicando la esencia comunitaria y artística que se vive en la facultad.

---

## Funcionalidades implementadas

* Registro e inicio de sesión de usuarios
* Creación, edición y eliminación de publicaciones
* Carga de imágenes y archivos en los posteos (límite de 5 MB)
* Comentarios anidados (respuestas a comentarios)
* Edición y eliminación de comentarios
* Sistema de "like" en publicaciones
* Perfil de usuario con:

  * Foto de perfil y portada (editables, máximo 5 MB cada una)
  * Lista de posteos y comentarios propios
* Sistema de notificaciones (actualmente no en tiempo real)

---

## Tecnologías utilizadas

### Backend:

* Node.js
* Express.js
* MongoDB + Mongoose
* Multer (para subir imágenes y archivos)
* JWT para autenticación
* Joi para validación
* bcryptjs para encriptación de contraseñas
* dotenv para variables de entorno

### Frontend (carpeta `Vinci-App/`):

* React.js (con Vite)
* React Router DOM
* Axios (para llamadas a la API)
* Bootstrap 5
* React PDF y Lightbox para visualizar archivos e imágenes

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/cami2001davinci/Vinci-App.git
cd Vinci-App
```

### 2. Instalación Backend

```bash
npm install
```

#### Variables de entorno del Backend (`.env`):

```
MONGODB_URI=TU_URI_DE_MONGODB
JWT_SECRET=TU_CLAVE_SECRETA
```

Comando para iniciar el Backend:

```bash
npm run dev
```

### 3. Instalación Frontend

```bash
cd Vinci-App
npm install
```

#### Variables de entorno del Frontend (`.env` dentro de Vinci-App):

```
VITE_API_URL=http://localhost:3000/api
VITE_SERVER_URL=http://localhost:3000
```

Comando para iniciar el Frontend:

```bash
npm run dev
```

---

## Pasos para correr el proyecto completo

1. Clonar el repositorio.
2. Instalar dependencias del Backend (`npm install` en la raíz).
3. Instalar dependencias del Frontend (`npm install` dentro de `Vinci-App`).
4. Crear los archivos `.env` siguiendo los ejemplos `.env.example` proporcionados.
5. Iniciar Backend con `npm run dev`.
6. Iniciar Frontend con `npm run dev` desde la carpeta `Vinci-App`.
7. Acceder a la aplicación en `http://localhost:5173`.

---

## Soporte para imágenes y archivos

* Las imágenes de perfil, portada y archivos en los posts se gestionan con Multer.
* Actualmente se aplica un límite de tamaño de 5 MB para cada archivo subido.
* Se recomienda mantener las imágenes livianas para mejorar la experiencia de usuario y la velocidad de carga.

Ejemplo sugerido de código:

```js
limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
```

---

## Notas personales y próximos pasos

"A este proyecto todavia le falta mucho desarrollo para este momento priorice las funcionalidades. Aún quedan varias funcionalidades por desarrollar y aspectos visuales por mejorar."

### Pendientes:

* Implementar notificaciones en tiempo real.
* Desarrollar el sistema de chat privado, en tiempo real con Socket.IO.
* Crear el sistema de Match de Proyectos para conectar usuarios.
* Agregar un buscador de publicaciones, usuarios o proyectos.
* Desarrollar el apartado de Eventos.
* Trabajar en el diseño visual y su adaptación a dispositivos móviles (responsive).
* Mejorar el perfil de usuario.

---

Autor: Camila Galíndez
Proyecto académico para Escuela Da Vinci.

---

## Archivos `.env.example`

Los archivos `.env.example` sirven como plantillas para que cualquier persona que descargue el proyecto sepa qué variables de entorno debe configurar, sin exponer datos sensibles.

### Para Backend (`.env.example` en la raíz):

```
MONGODB_URI=TU_URI_DE_MONGODB
JWT_SECRET=TU_SECRETO_PRIVADO
```

### Para Frontend (`.env.example` dentro de Vinci-App):

```
VITE_API_URL=http://localhost:3000/api
VITE_SERVER_URL=http://localhost:3000
```

Antes de iniciar el proyecto, cada usuario debe copiar estos ejemplos y renombrarlos a `.env`, completando los valores reales necesarios.
