import Post from '../models/postsModel.js';
import User from '../models/usersModel.js';
import Degree from '../models/degreesModel.js'; 

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

// Crear un nuevo post
export const createPost = async (req, res) => {
  try {
   const { content, category } = req.body;

if (!content || !category) {
  return res.status(400).json({ message: 'Contenido y categoría son requeridos' });
}


    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Buscar la carrera correspondiente al nombre que tiene el usuario
    const degree = await Degree.findOne({ name: user.degree });
    if (!degree) {
      return res.status(400).json({ message: 'Carrera del usuario no encontrada' });
    }

    const newPost = new Post({
  content,
  category,
  author: req.user._id,
  degree: degree._id,
});


    await newPost.save();

    user.posts.push(newPost._id);
    await user.save();

    res.status(201).json(newPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// HOME: obtener todos los posts
export const getAllPosts = async (req, res) => {
  try {
    const query = {};
    if (!req.user?.role || req.user.role !== 'admin') {
      query.flagged = false;
    }

    const posts = await Post.find(query)
      .populate('author', 'username')
      .populate('degree', 'name')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Obtener todos los posts del usuario autenticado
export const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'username')
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

// Obtener post por número
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId)
      .populate('author', 'username')
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

// Obtener todos los posts por carrera (segmentación por slug)
// FILTRO por carrera
export const getPostsByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug });
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    const query = { degree: degree._id };
    if (!req.user?.role || req.user.role !== 'admin') {
      query.flagged = false;
    }

    const posts = await Post.find(query)
      .populate('author', 'username')
      .populate('degree', 'name')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Dar o quitar "like" a un post
export const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const hasLiked = post.likedBy.includes(userId);

    if (hasLiked) {
      post.likedBy.pull(userId);
    } else {
      post.likedBy.push(userId);
    }

    await post.save();
    res.json({
      liked: !hasLiked,
      likesCount: post.likedBy.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    }

    await post.save();
    res.json({
      interested: !hasInterest,
      interestedCount: post.interestedUsers.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
