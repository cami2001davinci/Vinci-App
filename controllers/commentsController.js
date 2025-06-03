// controllers/commentController.js
import Comment from '../models/commentsModel.js';
import Post from '../models/postsModel.js';  // <-- Importar el modelo Post
import User from '../models/usersModel.js';



// Crear nuevo comentario
export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

   if (!postId || !content) {
  return res.status(400).json({ message: 'El ID del post y el contenido son obligatorios' });
}

    // Buscar el post con postNumber
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado con ese número' });
    }

    const newComment = new Comment({
      content,
      author: req.user._id,
      post: post._id
    });

    const savedComment = await newComment.save();

    // Actualizar el post agregando el nuevo comentario
    await Post.findByIdAndUpdate(post._id, { $push: { comments: savedComment._id } });

    // Actualizar el usuario con el nuevo comentario
    await User.findByIdAndUpdate(req.user._id, {
      $push: { comments: savedComment._id }
    });

    // Poblamos el autor con el username antes de enviar la respuesta
    const populatedComment = await Comment.findById(savedComment._id).populate('author', 'username');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Obtener comentarios del usuario autenticado
export const getCommentsByUser = async (req, res) => {
  try {
    const comments = await Comment.find({ author: req.user._id })
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Obtener comentarios por post
export const getCommentsByPost = async (req, res) => {
  const { postId } = req.params; // en realidad es postNumber

  try {
    // Buscar post por postNumber
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    // Buscar comentarios relacionados al ObjectId del post
    const comments = await Comment.find({ post: post._id })
      .populate('author', 'username')
      .sort({ createdAt: 1 }); // ascendente por fecha

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Editar comentario
export const updateComment = async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user._id;

  // Solo permitimos modificar el campo 'content'
  const updates = {};
  if (req.body.content !== undefined) {
    updates.content = req.body.content;
  }

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (comment.author.toString() !== userId.toString())
      return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'username');

    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// Eliminar comentario propio
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    // Buscar comentario por commentNumber
    const comment = await Comment.findById(commentId);

    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    if (comment.author.toString() !== userId.toString())
      return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });

    // Opcional: quitar referencia del comentario en el post
    if (comment.post) {
      await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    }

    // Quitar comentario de usuario (opcional, si guardas esa info)
    await User.findByIdAndUpdate(userId, { $pull: { comments: comment._id } });

    // Eliminar comentario directamente con findOneAndDelete
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleLikeOnComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    const hasLiked = comment.likedBy.includes(userId);

    if (hasLiked) {
      comment.likedBy.pull(userId);
    } else {
      comment.likedBy.push(userId);
    }

    await comment.save();
    res.json({
      liked: !hasLiked,
      likesCount: comment.likedBy.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
