// // controllers/commentController.js
// import Comment from '../models/commentsModel.js';
// import Post from '../models/postsModel.js';  // <-- Importar el modelo Post
// import User from '../models/usersModel.js';


// export const flagComment = async (req, res) => {
//   try {
//     const { commentId } = req.params;
//     const comment = await Comment.findByIdAndUpdate(commentId, { flagged: true }, { new: true });
//     if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });
//     res.json({ message: 'Comentario marcado como inapropiado', comment });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // Crear nuevo comentario
// export const createComment = async (req, res) => {
//   try {
//     const { postId, content, parentComment } = req.body;

//    if (!postId || !content) {
//   return res.status(400).json({ message: 'El ID del post y el contenido son obligatorios' });
// }

//     // Buscar el post con postNumber
//     const post = await Post.findById(postId);
//     if (!post) {
//       return res.status(404).json({ message: 'Post no encontrado con ese número' });
//     }

//     const newComment = new Comment({
//     content,
//     author: req.user.id,
//     post: post._id,
//     parentComment: parentComment || null
//     });

//     const savedComment = await newComment.save();

//     if (parentComment) {
//   await Comment.findByIdAndUpdate(parentComment, {
//     $push: { replies: savedComment._id }
//   });
// }
//     // Actualizar el post agregando el nuevo comentario
//     await Post.findByIdAndUpdate(post._id, { $push: { comments: savedComment._id } });

//     // Actualizar el usuario con el nuevo comentario
//     await User.findByIdAndUpdate(req.user._id, {
//       $push: { comments: savedComment._id }
//     });

//     // Poblamos el autor con el username antes de enviar la respuesta
//     const populatedComment = await Comment.findById(savedComment._id).populate('author', 'username');

//     res.status(201).json(populatedComment);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };


// // Obtener comentarios del usuario autenticado
// export const getCommentsByUser = async (req, res) => {
//   try {
//     const comments = await Comment.find({ author: req.user._id })
//       .populate('post', 'title')
//       .sort({ createdAt: -1 });
//     res.json(comments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // Obtener comentarios por post
// export const getCommentsByPost = async (req, res) => {
//   const { postId } = req.params;

//   try {
//     const post = await Post.findById(postId);
//     if (!post) {
//       return res.status(404).json({ message: 'Post no encontrado' });
//     }

//     // Obtener comentarios NO flagged si el usuario no es admin
//     const query = { post: post._id };
//     if (!req.user?.role || req.user.role !== 'admin') {
//       query.flagged = false;
//     }

//     const comments = await Comment.find(query)
//       .populate('author', 'username')
//       .sort({ createdAt: 1 });

//     res.json(comments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// // Editar comentario
// export const updateComment = async (req, res) => {
//   const commentId = req.params.commentId;
//   const userId = req.user._id;

//   // Solo permitimos modificar el campo 'content'
//   const updates = {};
//   if (req.body.content !== undefined) {
//     updates.content = req.body.content;
//   }

//   try {
//     const comment = await Comment.findById(commentId);
//     if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

//     if (comment.author.toString() !== userId.toString())
//       return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });

//     const updatedComment = await Comment.findByIdAndUpdate(
//       commentId,
//       updates,
//       { new: true, runValidators: true }
//     ).populate('author', 'username');

//     res.json(updatedComment);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };



// // Eliminar comentario propio
// export const deleteComment = async (req, res) => {
//   try {
//     const { commentId } = req.params;
//     const userId = req.user._id;

//     // Buscar comentario por commentNumber
//     const comment = await Comment.findById(commentId);

//     if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

//     if (comment.author.toString() !== userId.toString())
//       return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });

//     // Opcional: quitar referencia del comentario en el post
//     if (comment.post) {
//       await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
//     }

//     // Quitar comentario de usuario (opcional, si guardas esa info)
//     await User.findByIdAndUpdate(userId, { $pull: { comments: comment._id } });

//     // Eliminar comentario directamente con findOneAndDelete
//     await Comment.findByIdAndDelete(commentId);

//     res.json({ message: 'Comentario eliminado correctamente' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const toggleLikeOnComment = async (req, res) => {
//   const { commentId } = req.params;
//   const userId = req.user._id;

//   try {
//     const comment = await Comment.findById(commentId);
//     if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

//     const hasLiked = comment.likedBy.includes(userId);

//     if (hasLiked) {
//       comment.likedBy.pull(userId);
//     } else {
//       comment.likedBy.push(userId);
//     }

//     await comment.save();
//     res.json({
//       liked: !hasLiked,
//       likesCount: comment.likedBy.length
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// controllers/commentsController.js
import Comment from '../models/commentsModel.js';
import Post from '../models/postsModel.js';
import User from '../models/usersModel.js';

export const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findByIdAndUpdate(commentId, { flagged: true }, { new: true });
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });
    res.json({ message: 'Comentario marcado como inapropiado', comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId, content, parentComment } = req.body;

    if (!postId || !content) {
      return res.status(400).json({ message: 'El ID del post y el contenido son obligatorios' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado con ese ID' });
    }

    const newComment = new Comment({
      content,
      author: req.user.id || req.user._id,
      post: post._id,
      parentComment: parentComment || null
    });

    const savedComment = await newComment.save();

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: savedComment._id }
      });
    }

    await Post.findByIdAndUpdate(post._id, {
      $push: { comments: savedComment._id }
    });

    await User.findByIdAndUpdate(req.user.id || req.user._id, {
      $push: { comments: savedComment._id }
    });

    // ✅ Crear notificación
    if (parentComment) {
      // Si es respuesta a otro comentario
      const parent = await Comment.findById(parentComment);
      const author = await User.findById(parent.author);

      if (author && author._id.toString() !== (req.user.id || req.user._id).toString()) {
        author.notifications.push({
          type: 'comentario',
          message: 'Alguien respondió a tu comentario.',
          post: post._id,
          fromUser: req.user.id || req.user._id
        });
        await author.save();
      }
    } else {
      // Si es comentario directo al post
      const author = await User.findById(post.author);

      if (author && author._id.toString() !== (req.user.id || req.user._id).toString()) {
        author.notifications.push({
          type: 'comentario',
          message: 'Alguien comentó tu post.',
          post: post._id,
          fromUser: req.user.id || req.user._id
        });
        await author.save();
      }
    }

    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'username');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error en createComment:", error);
    res.status(400).json({ message: error.message });
  }
};


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

export const getCommentsByPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    const query = { post: post._id, parentComment: null }; // Solo comentarios raíz
    if (!req.user?.role || req.user.role !== 'admin') {
      query.flagged = false;
    }

    const comments = await Comment.find(query)
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    console.error("Error en getCommentsByPost:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Obtener respuestas a un comentario (subcomentarios)
export const getRepliesToComment = async (req, res) => {
  try {
    const replies = await Comment.find({ parentComment: req.params.commentId })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    console.error("Error al obtener respuestas:", err);
    res.status(500).json({ message: 'Error al obtener respuestas' });
  }
};

export const updateComment = async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user._id;

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

// controllers/commentsController.js

export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id; // 🔥 ESTO FALTABA 🔥

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
    }

    // ✅ Si tiene padre, removerlo del array replies
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    // 🔥 Eliminar el comentario
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar comentario:', err);
    res.status(500).json({ message: err.message });
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

