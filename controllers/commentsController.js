import Comment from "../models/commentsModel.js";
import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";
import mongoose from "mongoose";
import { getNotificationCounts } from "../src/utils/notificationCounts.js";

/* =========================================================================
   FLAG COMMENT (REPORTAR)
   ========================================================================= */
export const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // 1. Marcar como flaggeado en DB
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { flagged: true },
      { new: true }
    );

    if (!comment)
      return res.status(404).json({ message: "Comentario no encontrado" });

    // 2. EMITIR SOCKET PARA OCULTARLO EN TIEMPO REAL
    try {
        const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");
        const payload = {
            postId: comment.post.toString(),
            commentId: comment._id.toString(),
            parentComment: comment.parentComment ? comment.parentComment.toString() : null,
            isRoot: !comment.parentComment,
            action: 'flagged' // Flag útil para debug
        };
        // Usamos 'comment:delete' para que el frontend lo quite de la lista inmediatamente
        emitToPost(comment.post, "comment:delete", payload);
        emitToAll("comment:delete", payload);
    } catch (err) {
        console.error("Error socket flag:", err);
    }

    res.json({ message: "Comentario reportado.", comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================================
   CREATE COMMENT
   ========================================================================= */
export const createComment = async (req, res) => {
  try {
    const postId = req.body.postId || req.body.post;
    const content = (req.body.content || "").trim();
    const parentComment = req.body.parentComment || null;

    if (!postId) return res.status(400).json({ message: "Falta postId." });
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "postId no es un ObjectId válido." });
    }
    if (!content || content.length < 1) { // Ajustado a 1 char mínimo, puedes poner 3 si prefieres
      return res.status(400).json({ message: "El comentario no puede estar vacío." });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado." });

    const currentUserId = req.user.id || req.user._id;

    // 1. Crear comentario
    const newComment = new Comment({
      content,
      author: currentUserId,
      post: post._id,
      parentComment,
    });

    const savedComment = await newComment.save();

    // 2. Actualizar referencias (Padre, Post, Usuario)
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

    // 3. Notificaciones
    const actor = await User.findById(currentUserId).select("username profilePicture");

    if (parentComment) {
      // Notificación al dueño del comentario padre
      const parent = await Comment.findById(parentComment);
      if (parent) {
        const parentAuthor = await User.findById(parent.author);
        if (parentAuthor && parentAuthor._id.toString() !== currentUserId.toString()) {
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
      // Notificación al dueño del post
      const postAuthor = await User.findById(post.author);
      if (postAuthor && postAuthor._id.toString() !== currentUserId.toString()) {
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

    // 4. Tiempo Real (Socket)
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

      if (realtime.emitToPost) realtime.emitToPost(post._id, "post:comment", payload);
      if (realtime.emitToAll) realtime.emitToAll("post:comment", payload);
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
   GET COMMENTS OF A POST
   ========================================================================= */
export const getCommentsByPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    // Filtramos los flaggeados si no es admin
    const query = { post: post._id, parentComment: null };
    if (!req.user?.role || req.user.role !== "admin") {
      query.flagged = false; // Asumiendo 'false' o que el campo no exista
    }

    const comments = await Comment.find(query)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      })
      .sort({ createdAt: -1 });

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
      .sort({ createdAt: -1 });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================================
   GET COMMENT PATH
   ========================================================================= */
export const getCommentPath = async (req, res) => {
  try {
    const commentId = req.params.pathId || req.params.commentId || req.params.id;
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

/* =========================================================================
   UPDATE COMMENT
   ========================================================================= */
export const updateComment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const userId = req.user.id || req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "No encontrado" });

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sin permiso" });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content: req.body.content },
      { new: true, runValidators: true }
    ).populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees"
    });

    try {
      const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");
      const payload = {
        commentId: updatedComment._id.toString(),
        postId: updatedComment.post.toString(),
        parentComment: updatedComment.parentComment ? updatedComment.parentComment.toString() : null,
        content: updatedComment.content,
        updatedAt: updatedComment.updatedAt
      };
      emitToPost(updatedComment.post, "comment:update", payload);
      emitToAll("comment:update", payload);
    } catch (err) { console.error(err); }

    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/* =========================================================================
   DELETE COMMENT
   ========================================================================= */
export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const userId = (req.user.id || req.user._id).toString();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "No encontrado" });

    if (comment.author.toString() !== userId) {
      return res.status(403).json({ message: "Sin permiso" });
    }

    const postId = comment.post;
    const parentComment = comment.parentComment;

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, { $pull: { replies: comment._id } });
    }
    await Post.findByIdAndUpdate(postId, { $pull: { comments: comment._id } });
    await User.findByIdAndUpdate(userId, { $pull: { comments: comment._id } });
    await Comment.findByIdAndDelete(commentId);

    try {
      const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");
      const payload = {
        postId: postId.toString(),
        commentId: comment._id.toString(),
        parentComment: parentComment ? parentComment.toString() : null,
      };
      emitToPost(postId, "comment:delete", payload);
      emitToAll("comment:delete", payload);
    } catch (err) { console.error(err); }

    res.json({ message: "Eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================================
   TOGGLE LIKE
   ========================================================================= */
export const toggleLikeOnComment = async (req, res) => {
  const commentId = req.params.commentId || req.params.id;
  const userId = req.user.id || req.user._id;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comentario no encontrado" });

    if (!Array.isArray(comment.likedBy)) comment.likedBy = [];

    const hasLiked = comment.likedBy.some(id => id.toString() === userId.toString());

    if (hasLiked) {
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likedBy.push(userId);
      // Notificación de like...
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
               entity: { kind: "comment", id: comment._id },
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
      const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");
      emitToPost(comment.post, "comment:like", likePayload);
      emitToAll("comment:like", likePayload);
    } catch (err) { console.error("Error like socket:", err.message); }

    return res.json({
      liked: !hasLiked,
      likesCount: comment.likedBy.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};