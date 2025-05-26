// controllers/commentController.js
import Counter from '../models/counterModel.js';
import Comment from '../models/commentsModel.js';
import Post from '../models/postsModel.js';  // <-- Importar el modelo Post
import User from '../models/usersModel.js';


async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Crear nuevo comentario
export const createComment = async (req, res) => {
  try {
    const { postNumber, content } = req.body;

    if (!postNumber) {
      return res.status(400).json({ message: 'El número del post es obligatorio' });
    }

    // Buscar el post con postNumber
    const post = await Post.findOne({ postNumber });
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado con ese número' });
    }

    const nextNumber = await getNextSequence('commentNumber');

    const newComment = new Comment({
      content,
      commentNumber: nextNumber,
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
    const post = await Post.findOne({ postNumber: Number(postId) });
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
 const commentNumber = Number(req.params.commentNumber);
  const userId = req.user._id;

  // Solo permitimos modificar el campo 'content'
  const updates = {};
  if (req.body.content !== undefined) {
    updates.content = req.body.content;
  }

  try {
    const comment = await Comment.findOne({ commentNumber });
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (comment.author.toString() !== userId.toString())
      return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });

    const updatedComment = await Comment.findOneAndUpdate(
      { commentNumber },
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
    const { commentNumber } = req.params;
    const userId = req.user._id;

    // Buscar comentario por commentNumber
    const comment = await Comment.findOne({ commentNumber });

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
    await Comment.findOneAndDelete({ commentNumber });

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
