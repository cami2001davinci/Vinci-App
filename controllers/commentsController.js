import Comment from "../models/commentsModel.js";
import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";
import mongoose from "mongoose";

export const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { flagged: true },
      { new: true }
    );
    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });
    res.json({ message: "Comentario marcado como inapropiado", comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    console.log("createComment body:", req.body);

    const postId = req.body.postId || req.body.post;
    const content = (req.body.content || "").trim();
    const parentComment = req.body.parentComment || null;

    if (!postId) return res.status(400).json({ message: "Falta postId." });
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ message: "postId no es un ObjectId válido." });
    }
    if (!content || content.length < 3) {
      return res
        .status(400)
        .json({ message: "El comentario debe tener al menos 3 caracteres." });
    }

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post no encontrado con ese ID." });

    const currentUserId = req.user.id || req.user._id;

    const newComment = new Comment({
      content,
      author: currentUserId,
      post: post._id,
      parentComment,
    });

    const savedComment = await newComment.save();

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: savedComment._id },
      });
    }
    await Post.findByIdAndUpdate(post._id, {
      $push: { comments: savedComment._id },
    });
    await User.findByIdAndUpdate(currentUserId, {
      $push: { comments: savedComment._id },
    });

    // -------- Notificación + tiempo real --------
    const actor = await User.findById(currentUserId).select(
      "username profilePicture"
    );

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (parent) {
        const parentAuthor = await User.findById(parent.author);
        if (
          parentAuthor &&
          parentAuthor._id.toString() !== currentUserId.toString()
        ) {
          const notif = {
            type: "comentario",
            message: `${
              actor?.username || "Alguien"
            } respondió a tu comentario.`,
            post: post._id,
            fromUser: currentUserId,
            fromUserName: actor?.username || "",
            fromUserAvatar: actor?.profilePicture || "",
            data: { commentId: savedComment._id }, // 👈 SNAPSHOT para deep-link
            read: false,
            createdAt: new Date(),
          };

          parentAuthor.notifications.push(notif);
          await parentAuthor.save();

          const unreadCount = parentAuthor.notifications.filter(
            (n) => !n.read
          ).length;
          const { emitToUser } = await import("../src/utils/realtime.js");
          emitToUser(parentAuthor._id, "notification", notif);
          emitToUser(parentAuthor._id, "notifications:count", { unreadCount });
        }
      }
    } else {
      // comentario directo al post
      const postAuthor = await User.findById(post.author);
      if (
        postAuthor &&
        postAuthor._id.toString() !== currentUserId.toString()
      ) {
        const notif = {
          type: "comentario",
          message: `${actor?.username || "Alguien"} comentó tu post.`,
          post: post._id,
          fromUser: currentUserId,
          fromUserName: actor?.username || "",
          fromUserAvatar: actor?.profilePicture || "",
          data: { commentId: savedComment._id }, // 👈 igual
          read: false,
          createdAt: new Date(),
        };

        postAuthor.notifications.push(notif);
        await postAuthor.save();

        const unreadCount = postAuthor.notifications.filter(
          (n) => !n.read
        ).length;
        const { emitToUser } = await import("../src/utils/realtime.js");
        emitToUser(postAuthor._id, "notification", notif);
        emitToUser(postAuthor._id, "notifications:count", { unreadCount });
      }
    }
    // -------- fin notificación --------

    // emitir a todos los que están viendo el post (para que aparezca el comment sin refrescar)
    const populatedComment = await Comment.findById(savedComment._id).populate(
      "author",
      "username profilePicture"
    );

    const { emitToPost } = await import("../src/utils/realtime.js");
    emitToPost(post._id, "post:comment", {
      postId: post._id.toString(),
      newComment: populatedComment,
    });

    return res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error en createComment:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getCommentsByUser = async (req, res) => {
  try {
    const comments = await Comment.find({ author: req.user._id })
      .populate("post", "title")
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
      return res.status(404).json({ message: "Post no encontrado" });
    }

    const query = { post: post._id, parentComment: null }; // Solo comentarios raíz
    if (!req.user?.role || req.user.role !== "admin") {
      query.flagged = false;
    }

    const comments = await Comment.find(query)
      .populate("author", "username profilePicture")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    console.error("Error en getCommentsByPost:", error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener respuestas a un comentario (subcomentarios)
export const getRepliesToComment = async (req, res) => {
  try {
    const replies = await Comment.find({ parentComment: req.params.commentId })
      .populate("author", "username profilePicture")
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    console.error("Error al obtener respuestas:", err);
    res.status(500).json({ message: "Error al obtener respuestas" });
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
    if (!comment)
      return res.status(404).json({ error: "Comentario no encontrado" });

    if (comment.author.toString() !== userId.toString())
      return res
        .status(403)
        .json({ error: "No tienes permiso para editar este comentario" });

    const updatedComment = await Comment.findByIdAndUpdate(commentId, updates, {
      new: true,
      runValidators: true,
    }).populate("author", "username");

    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    if (comment.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar este comentario" });
    }

    // Si tiene padre, removerlo del array replies
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
    }

    // Eliminar el comentario
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: "Comentario eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar comentario:", err);
    res.status(500).json({ message: err.message });
  }
};

export const toggleLikeOnComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    if (!Array.isArray(comment.likedBy)) comment.likedBy = [];

    const hasLiked = comment.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      comment.likedBy.push(userId);
    }

    await comment.save();

    return res.json({
      liked: !hasLiked,
      likesCount: comment.likedBy.length,
    });
  } catch (error) {
    console.error("Error en toggleLikeOnComment:", error);
    return res.status(500).json({ message: error.message });
  }
};
