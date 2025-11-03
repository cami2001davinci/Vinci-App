import Post from '../models/postsModel.js';
import User from '../models/usersModel.js';
import Degree from '../models/degreesModel.js'; 
import { createPostSchema } from '../validations/postAndCommentValidation.js';

// Función para autoincrementar postNumber

export const flagPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByIdAndUpdate(postId, { flagged: true }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });
    res.json({ message: 'Post marcado como inapropiado', post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    // 1) Copiar body y parsear "links" si vino como string (multipart/form-data)
    const body = { ...req.body };
    if (typeof body.links === 'string') {
      try { body.links = JSON.parse(body.links); }
      catch { body.links = []; }
    }

    // 2) Validar con Joi (título, contenido, categoría, links opcionales, toolsUsed, degreeSlug/Id)
    const { value, error } = createPostSchema.validate(body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(d => d.message);
      return res.status(400).json({ message: 'Datos inválidos', errors });
    }

    const { title, content, category, degreeSlug, degreeId, toolsUsed, links } = value;

    // 3) Resolver carrera (degree) por slug o id
    let degreeDoc = null;
    if (degreeSlug) {
      degreeDoc = await Degree.findOne({ slug: degreeSlug }).select('_id');
      if (!degreeDoc) return res.status(400).json({ message: 'Carrera no encontrada' });
    } else if (degreeId) {
      degreeDoc = await Degree.findById(degreeId).select('_id');
      if (!degreeDoc) return res.status(400).json({ message: 'Carrera no encontrada' });
    } else {
      return res.status(400).json({ message: 'Debes indicar una carrera (degreeSlug o degreeId)' });
    }

    // 4) Adjuntos (opcional): separar imágenes y documentos
    const uploadedImages = [];
    const uploadedDocs = [];
    if (Array.isArray(req.files)) {
      req.files.forEach(f => {
        if (f.mimetype?.startsWith('image/')) {
          uploadedImages.push(`/uploads/imgs/${f.filename}`);
        } else {
          uploadedDocs.push(`/uploads/docs/${f.filename}`);
        }
      });
    }

    // 5) Flag automático (por ahora mantenemos tu lógica)
    const lookingForCollab = category === 'colaboradores';

    // 6) Crear documento
    const newPost = new Post({
      author: req.user._id,
      degree: degreeDoc._id,
      title: title.trim(),
      content: content.trim(),
      category,
      toolsUsed: Array.isArray(toolsUsed) ? toolsUsed : [],
      links: Array.isArray(links) ? links : [],
      images: uploadedImages,
      documents: uploadedDocs,
      lookingForCollab
    });

    await newPost.save();

    // 7) Devolver ya populado (autor con sus carreras y la carrera del post)
    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: 'author',
        select: 'username firstName lastName profilePicture degrees',
        populate: { path: 'degrees', select: 'name slug' }
      })
      .populate('degree', 'name slug');

    return res.status(201).json(populatedPost);

  } catch (err) {
    console.error('Error createPost:', err);
    return res.status(500).json({ message: 'Error al crear post' });
  }
};

// HOME: obtener todos los posts (para Home)
export const getAllPosts = async (req, res) => {
  try {
    const { limit = 20, cursor, category } = req.query;

    // filtro base
    const match = {};
    if (category) match.category = category;
    if (cursor) match.createdAt = { $lt: new Date(cursor) };

    // si no es admin, ocultar los "flagged"
    if (!req.user?.role || req.user.role !== 'admin') {
      match.flagged = { $ne: true }; // NO igual a true (incluye undefined y false)
    }

    const posts = await Post.find(match)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate({
        path: 'author',
        select: 'username firstName lastName profilePicture degrees',
        populate: { path: 'degrees', select: 'name slug' }
      })
      .populate('degree', 'name slug');

    // (opcional) cursor para "ver más"
    // const nextCursor = posts.length ? posts[posts.length - 1].createdAt.toISOString() : null;

    return res.json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error cargando posts' });
  }
};

// Obtener todos los posts del usuario autenticado
export const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'username profilePicture')
      .populate('degree', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' }
      })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener post por id
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId)
      .populate('author', 'username profilePicture')
      .populate('degree', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' },
        options: { sort: { createdAt: 1 } }
      });

    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar post
export const updatePost = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== userId.toString())
      return res.status(403).json({ message: 'No tienes permiso para editar este post' });

    const updatedPost = await Post.findByIdAndUpdate(postId, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar post
export const deletePostById = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== userId.toString())
      return res.status(403).json({ message: 'No tienes permiso para eliminar este post' });

    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /posts/degree/:slug/category-stats
export const getCategoryStatsByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug }).select('_id');
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    const stats = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 }, lastPostAt: { $max: '$createdAt' } } },
      { $project: { _id: 0, category: '$_id', count: 1, lastPostAt: 1 } },
      { $sort: { category: 1 } }
    ]);

    res.json({ items: stats });
  } catch (e) {
    res.status(500).json({ message: 'Error obteniendo contadores' });
  }
};

export const getPostsByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const { category, limit = 20, cursor } = req.query;

    // 1) Obtener la carrera por slug
    const degree = await Degree.findOne({ slug })
      .select('_id name slug')
      .lean();
    if (!degree) {
      return res.status(404).json({ message: 'Carrera no encontrada' });
    }

    // 2) Armar el filtro (match)
    const match = { degree: degree._id };
    if (category) match.category = category;
    if (cursor) match.createdAt = { $lt: new Date(cursor) };
    if (!req.user?.role || req.user.role !== 'admin') {
      match.flagged = { $ne: true };
    }

    // 3) Buscar posts
    const posts = await Post.find(match)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate({
        path: 'author',
        select: 'username firstName lastName profilePicture degrees',
        populate: { path: 'degrees', select: 'name slug' } // autor -> carreras
      })
      .populate('degree', 'name slug'); // carrera del post

    // 4) Cursor para paginación
    const nextCursor = posts.length
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    // 5) Responder
    return res.json({ degree, items: posts, nextCursor });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error listando posts por carrera' });
  }
};

// Dar o quitar "like" a un post
// Dar o quitar "like" a un post
export const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    // Asegurar array
    if (!Array.isArray(post.likedBy)) post.likedBy = [];

    // Comparación robusta de ObjectId
    const hasLiked = post.likedBy.some(id => id.toString() === userId.toString());

    if (hasLiked) {
      // Quitar like
      post.likedBy = post.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Agregar like
      post.likedBy.push(userId);

      // Notificación solo si es nuevo like y no es self-like
      if (post.author.toString() !== userId.toString()) {
        const [author, actor] = await Promise.all([
          User.findById(post.author),
          User.findById(userId).select('username')
        ]);

        if (author) {
          const notif = {
            type: 'like',
            message: `${actor?.username || 'Alguien'} le dio like a “${post.title}”.`,
            post: post._id,
            fromUser: userId,
            read: false,
            createdAt: new Date()
          };
          author.notifications.push(notif);
          await author.save();

          // Emitir notificación en tiempo real
          const { emitToUser } = await import('../src/utils/realtime.js'); // 👈 ruta correcta
          emitToUser(author._id, 'notification', notif);
        }
      }
    }

    // Guardar post antes de emitir el contador actualizado
    await post.save();

    // Emitir evento específico para actualizar contadores en vivo
    const { emitToUser, emitToPost } = await import('../src/utils/realtime.js'); // 👈 ruta correcta
    const likePayload = {
      postId: post._id.toString(),
      likesCount: post.likedBy.length,
      actorId: userId.toString(),
    };

    // Al autor del post (actualiza su UI sin refrescar)
    emitToUser(post.author, 'post:like', likePayload);

    emitToPost(post._id, 'post:like', likePayload);

    // (Opcional) eco al que dio like, si querés actualizar su UI en otra vista
    // emitToUser(userId, 'post:like:ack', likePayload);

    return res.json({
      liked: !hasLiked,
      likesCount: post.likedBy.length
    });
  } catch (error) {
    console.error('Error en toggleLike:', error);
    return res.status(500).json({ message: 'Error al dar like' });
  }
};



// Mostrar o quitar interés en colaborar (match)
export const toggleInterest = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const hasInterest = post.interestedUsers.includes(userId);

    if (hasInterest) {
      post.interestedUsers.pull(userId);
    } else {
      post.interestedUsers.push(userId);

      // Crear notificación al autor (nuevo interés)
      const author = await User.findById(post.author);
      if (author && author._id.toString() !== userId.toString()) {
        const actor = await User.findById(userId).select('username');
        const notif = {
          type: 'match', // si preferís 'interest', cambiá aquí y en el front
          message: `${actor?.username || 'Un usuario'} mostró interés en tu post “${post.title}”.`,
          post: post._id,
          fromUser: userId,
          read: false,
          createdAt: new Date()
        };
        author.notifications.push(notif);
        await author.save();

        // 🔔 emitir en tiempo real
        const { emitToUser } = await import('../src/utils/realtime.js');
        emitToUser(author._id, 'notification', notif);
      }
    }

    await post.save();
    res.json({
      interested: !hasInterest,
      interestedCount: post.interestedUsers.length
    });
  } catch (error) {
    console.error('Error en toggleInterest:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /posts/degree/:slug/category-activity
export const getCategoryActivityByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug }).select('_id');
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    // 1) Ordenamos por fecha descendente para “autores recientes”
    const activity = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true } } },
      { $sort: { createdAt: -1 } },

      // 2) Agrupamos por categoría
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          lastPostAt: { $max: '$createdAt' },
          authors: { $push: '$author' } // ordenados por createdAt desc
        }
      },

      // 3) Autores únicos y cortamos a 3
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
          lastPostAt: 1,
          authors: { $slice: [ { $setUnion: ['$authors', []] }, 3 ] }
        }
      },

      // 4) Enriquecemos autores (avatar/username)
      {
        $lookup: {
          from: 'users',
          localField: 'authors',
          foreignField: '_id',
          as: 'authorDocs'
        }
      },
      {
        $project: {
          category: 1,
          count: 1,
          lastPostAt: 1,
          authors: {
            $map: {
              input: '$authorDocs',
              as: 'u',
              in: {
                _id: '$$u._id',
                username: '$$u.username',
                profilePicture: '$$u.profilePicture'
              }
            }
          }
        }
      }
    ]);

    res.json({ items: activity });
  } catch (e) {
    res.status(500).json({ message: 'Error obteniendo actividad' });
  }
};
