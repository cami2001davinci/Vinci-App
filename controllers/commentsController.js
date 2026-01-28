import Comment from "../models/commentsModel.js";
import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";
import mongoose from "mongoose";
import { getNotificationCounts } from "../src/utils/notificationCounts.js";

/* =========================================================================
   FLAG COMMENT
   ========================================================================= */
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

/* =========================================================================
   CREATE COMMENT + REALTIME
   ========================================================================= */
export const createComment = async (req, res) => {
  try {
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
      return res.status(400).json({
        message: "El comentario debe tener al menos 3 caracteres.",
      });
    }

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post no encontrado con ese ID." });

    const currentUserId = req.user.id || req.user._id;

    // Crear comentario
    const newComment = new Comment({
      content,
      author: currentUserId,
      post: post._id,
      parentComment,
    });

    const savedComment = await newComment.save();

    // Actualizar replies si tiene padre
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: savedComment._id },
      });
    }

    // Agregar al post
    await Post.findByIdAndUpdate(post._id, {
      $push: { comments: savedComment._id },
    });

    // Agregar al usuario
    await User.findByIdAndUpdate(currentUserId, {
      $push: { comments: savedComment._id },
    });

    /* ==============================
       NOTIFICACIONES
       ============================== */
    const actor = await User.findById(currentUserId).select(
      "username profilePicture"
    );

    if (parentComment) {
      // Notificación por respuesta
      const parent = await Comment.findById(parentComment);
      if (parent) {
        const parentAuthor = await User.findById(parent.author);
        if (
          parentAuthor &&
          parentAuthor._id.toString() !== currentUserId.toString()
        ) {
          const notif = {
            type: "COMMENT_POST",
            message: `${actor?.username || "Alguien"} respondió a tu comentario.`,
            post: post._id,
            fromUser: currentUserId,
            fromUserName: actor?.username || "",
            fromUserAvatar: actor?.profilePicture || "",
            entity: { kind: "reply", id: savedComment._id },
            data: { commentId: savedComment._id },
            read: false,
            createdAt: new Date(),
          };

          parentAuthor.notifications.push(notif);
          await parentAuthor.save();

          const counts = getNotificationCounts(parentAuthor);

          const { emitToUser } = await import("../src/utils/realtime.js");
          emitToUser(parentAuthor._id, "notification", notif);
          emitToUser(parentAuthor._id, "notification:new", notif);
          emitToUser(parentAuthor._id, "notifications:count", counts);
        }
      }
    } else {
      // Notificación al autor del post
      const postAuthor = await User.findById(post.author);
      if (
        postAuthor &&
        postAuthor._id.toString() !== currentUserId.toString()
      ) {
        const notif = {
          type: "COMMENT_POST",
          message: `${actor?.username || "Alguien"} comentó tu post.`,
          post: post._id,
          fromUser: currentUserId,
          fromUserName: actor?.username || "",
          fromUserAvatar: actor?.profilePicture || "",
          entity: { kind: "comment", id: savedComment._id },
          data: { commentId: savedComment._id },
          read: false,
          createdAt: new Date(),
        };

        postAuthor.notifications.push(notif);
        await postAuthor.save();

        const counts = getNotificationCounts(postAuthor);

        const { emitToUser } = await import("../src/utils/realtime.js");
        emitToUser(postAuthor._id, "notification", notif);
        emitToUser(postAuthor._id, "notification:new", notif);
        emitToUser(postAuthor._id, "notifications:count", counts);
      }
    }

    /* =========================================================================
       TIEMPO REAL DEL COMENTARIO NUEVO
       ========================================================================= */
    const populatedComment = await Comment.findById(savedComment._id).populate({
      path: "author",
      select: "username firstName lastName profilePicture degrees",
      populate: { path: "degrees", select: "name slug" },
    });

    try {
      const realtime = await import("../src/utils/realtime.js");

      const payload = {
        postId: post._id.toString(),
        newComment: populatedComment,
      };

      // A la room del post
      if (typeof realtime.emitToPost === "function") {
        realtime.emitToPost(post._id, "post:comment", payload);
      }

      // Broadcast global (Home, DegreePage, otras pestañas)
      if (typeof realtime.emitToAll === "function") {
        realtime.emitToAll("post:comment", payload);
      }
    } catch (err) {
      console.error("Error emitiendo post:comment:", err);
    }

    return res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error en createComment:", error);
    return res.status(400).json({ message: error.message });
  }
};

/* =========================================================================
   GET COMMENTS BY USER
   ========================================================================= */
export const getCommentsByUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const comments = await Comment.find({ author: userId })
      .populate("post", "title")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================================
   GET COMMENTS OF A POST (ROOT ONLY)
   ========================================================================= */
export const getCommentsByPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);
    if (!post)
      return res.status(404).json({ message: "Post no encontrado" });

    const query = { post: post._id, parentComment: null };
    if (!req.user?.role || req.user.role !== "admin") {
      query.flagged = false;
    }

    const comments = await Comment.find(query)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      })
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================================
   GET REPLIES
   ========================================================================= */
export const getRepliesToComment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;

    const replies = await Comment.find({ parentComment: commentId })
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      })
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================================
   UPDATE COMMENT
   ========================================================================= */
export const updateComment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const userId = req.user.id || req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ error: "Comentario no encontrado" });

    const authorId =
      typeof comment.author === "object" && comment.author._id
        ? comment.author._id.toString()
        : comment.author.toString();

    if (authorId !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para editar este comentario" });
    }

    const updates = {};
    if (req.body.content !== undefined) {
      updates.content = req.body.content;
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      updates,
      { new: true, runValidators: true }
    ).populate("author", "username");

    if (!updatedComment) {
      return res.status(404).json({ error: "Comentario no encontrado" });
    }

    try {
      const { emitToPost, emitToAll } = await import(
        "../src/utils/realtime.js"
      );

      const payload = {
        commentId: updatedComment._id.toString(),
        postId: updatedComment.post?.toString(),
        parentComment: updatedComment.parentComment
          ? updatedComment.parentComment.toString()
          : null,
        content: updatedComment.content,
        comment: updatedComment,
      };

      emitToPost(updatedComment.post, "comment:update", payload);
      emitToAll("comment:update", payload);
    } catch (err) {
      console.error("Error emitiendo comment:update:", err.message);
    }

    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/* =========================================================================
   DELETE COMMENT + REALTIME + FIX CONTADOR
   ========================================================================= */
export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const userId = (req.user.id || req.user._id).toString();

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    const authorId =
      typeof comment.author === "object" && comment.author._id
        ? comment.author._id.toString()
        : comment.author.toString();

    if (authorId !== userId) {
      return res.status(403).json({
        message: "No tienes permiso para eliminar este comentario",
      });
    }

    const postId = comment.post;
    const wasRoot = !comment.parentComment;

    // Sacar de replies
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
    }

    // Sacar del Post (fix contador)
    await Post.findByIdAndUpdate(postId, {
      $pull: { comments: comment._id },
    });

    // Sacar del usuario
    await User.findByIdAndUpdate(userId, {
      $pull: { comments: comment._id },
    });

    // Borrar comentario
    await Comment.findByIdAndDelete(commentId);

    // Tiempo real
    try {
      const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");

      const payload = {
        postId: postId.toString(),
        commentId: comment._id.toString(),
        parentComment: comment.parentComment
          ? comment.parentComment.toString()
          : null,
        isRoot: wasRoot,
      };

      emitToPost(postId, "comment:delete", payload);
      emitToAll("comment:delete", payload);
    } catch (err) {
      console.error("Error emitiendo comment:delete:", err.message);
    }

    res.json({ message: "Comentario eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================================
   TOGGLE LIKE ON COMMENT + REALTIME
   ========================================================================= */
export const toggleLikeOnComment = async (req, res) => {
  const commentId = req.params.commentId || req.params.id;
  const userId = req.user.id || req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    if (!Array.isArray(comment.likedBy)) comment.likedBy = [];

    const hasLiked = comment.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      // Quitar like
      comment.likedBy = comment.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Agregar like
      comment.likedBy.push(userId);

      const isSelfLike = comment.author.toString() === userId.toString();

      if (!isSelfLike) {
        const [commentAuthor, actor] = await Promise.all([
          User.findById(comment.author),
          User.findById(userId).select("username profilePicture"),
        ]);

        if (commentAuthor) {
          const notif = {
            type: "LIKE_COMMENT",
            message: `${actor?.username || "Alguien"} le dio like a tu comentario.`,
            post: comment.post,
            fromUser: userId,
            fromUserName: actor?.username || "",
            fromUserAvatar: actor?.profilePicture || "",
            entity: {
              kind: "comment",
              id: comment._id,
            },
            data: { commentId: comment._id },
            read: false,
            createdAt: new Date(),
          };

          commentAuthor.notifications.push(notif);
          await commentAuthor.save();

          const counts = getNotificationCounts(commentAuthor);

          const { emitToUser } = await import("../src/utils/realtime.js");

          emitToUser(commentAuthor._id, "notification", notif);
          emitToUser(commentAuthor._id, "notification:new", notif);
          emitToUser(commentAuthor._id, "notifications:count", counts);
        }
      }
    }

    await comment.save();

    const likePayload = {
      commentId: comment._id.toString(),
      postId: comment.post.toString(),
      likesCount: comment.likedBy.length,
      actorId: userId.toString(),
    };

    try {
      const { emitToPost, emitToAll } = await import(
        "../src/utils/realtime.js"
      );
      emitToPost(comment.post, "comment:like", likePayload);
      emitToAll("comment:like", likePayload);
    } catch (err) {
      console.error("Error emitiendo comment:like:", err.message);
    }

    return res.json({
      liked: !hasLiked,
      likesCount: comment.likedBy.length,
    });
  } catch (error) {
    console.error("Error en toggleLikeOnComment:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================================================================
   GET COMMENT PATH (para despliegue desde notificaciones)
   ========================================================================= */
export const getCommentPath = async (req, res) => {
  try {
    const commentId = req.params.pathId || req.params.commentId || req.params.id;

    // FIX: evitamos 404 y CastError, devolviendo [] si el id no es válido
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.json([]);
    }
    const start = await Comment.findById(commentId);
    if (!start) return res.json([]);

    const path = [start._id.toString()];
    let current = start;

    while (current.parentComment) {
      current = await Comment.findById(current.parentComment);
      if (!current) break;
      path.unshift(current._id.toString());
    }

    res.json(path);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener el camino" });
  }
};
