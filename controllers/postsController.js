import Post from "../models/postsModel.js";
import mongoose from "mongoose";
import User from "../models/usersModel.js";
import Degree from "../models/degreesModel.js";
import { createPostSchema } from "../validations/postAndCommentValidation.js";
import Message from "../models/messageModel.js";
import { findOrCreateDirectConversation } from "./chatController.js";

// Helper: Obtener ID seguro (string)
const getSafeId = (entity) => {
  return entity?._id ? entity._id.toString() : entity?.toString();
};

export const flagPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Actualizamos el post a flagged: true
    const post = await Post.findByIdAndUpdate(
      id,
      { flagged: true },
      { new: true },
    );

    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    // --- SOCKET.IO: Notificar a todos que este post fue ocultado/reportado ---
    const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");

    const payload = { postId: id };

    // Esto hará que desaparezca del feed de otros usuarios en tiempo real
    emitToAll("post:deleted", payload);
    emitToPost(id, "post:deleted", payload);

    res.json({ message: "Publicación reportada y enviada a revisión.", post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const acceptCollaborationAndChat = async (req, res) => {
  const { id, userId } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const post = await Post.findById(id).session(session);
    if (!post) {
      throw new Error("Proyecto no encontrado");
    }

    if (post.author.toString() !== req.user._id.toString()) {
      throw new Error("No tienes permiso");
    }

    const interestIndex = post.interestedUsers.findIndex(
      (i) => i.user.toString() === userId.toString(),
    );

    if (interestIndex === -1) {
      throw new Error("Solicitud no encontrada o usuario canceló");
    }

    const alreadyAccepted =
      post.interestedUsers[interestIndex].status === "accepted";

    post.interestedUsers[interestIndex].status = "accepted";

    const alreadyInTeam = post.selectedCollaborators.some(
      (pid) => pid.toString() === userId.toString(),
    );
    if (!alreadyInTeam) {
      post.selectedCollaborators.push(userId);
    }

    await post.save({ session });

    const conversation = await findOrCreateDirectConversation(
      req.user._id,
      userId,
      session,
    );

    let systemMessageSent = false;

    if (!alreadyAccepted) {
      const lastMsg = await Message.findOne({ conversation: conversation._id })
        .sort({ createdAt: -1 })
        .session(session);

      const isDuplicateMsg =
        lastMsg &&
        lastMsg.context?.type === "PROJECT_MATCH" &&
        lastMsg.context?.projectId?.toString() === post._id.toString();

      if (!isDuplicateMsg) {
        const systemMessage = await Message.create(
          [
            {
              conversation: conversation._id,
              sender: req.user._id,
              content: `¡Te doy la bienvenida al equipo de "${post.title}"!`,
              readBy: [req.user._id],
              context: {
                type: "PROJECT_MATCH",
                projectId: post._id,
                projectTitle: post.title,
                status: "accepted",
              },
            },
          ],
          { session },
        );

        conversation.lastMessage = systemMessage[0].content;
        conversation.lastSender = req.user._id;
        conversation.lastMessageAt = new Date();

        const newUnread = conversation.unreadBy.map((id) => id.toString());
        if (!newUnread.includes(userId.toString())) {
          conversation.unreadBy.push(userId);
        }
        await conversation.save({ session });
        systemMessageSent = true;
      }
    }

    await session.commitTransaction();
    session.endSession();

    // 👇 AQUÍ VA EL FIX (Dentro del TRY, después de cerrar la sesión y guardar todo)
    try {
      const { emitToAll } = await import("../src/utils/realtime.js");
      if (emitToAll) emitToAll("collab:updated", { postId: post._id });
    } catch (err) {
      console.error("Error emitiendo collab:updated:", err);
    }

    // Respuesta de éxito
    res.json({
      ok: true,
      conversationId: conversation._id,
      postStatus: "accepted",
      message: systemMessageSent
        ? "Match confirmado y chat abierto"
        : "Ya estaba aceptado, abriendo chat",
    });

  } catch (error) {
    
    await session.abortTransaction();
    session.endSession();
    console.error("Error Transaction:", error);

    const statusCode = error.message.includes("permiso")
      ? 403
      : error.message.includes("no encontrado")
        ? 404
        : 500;

    res
      .status(statusCode)
      .json({ message: error.message || "Error al procesar colaboración" });
  }
};

export const createPost = async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.links === "string") {
      try {
        body.links = JSON.parse(body.links);
      } catch {
        body.links = [];
      }
    }

    const { value, error } = createPostSchema.validate(body, {
      abortEarly: false,
    });
    if (error) {
      const errors = error.details.map((d) => d.message);
      return res.status(400).json({ message: "Datos inválidos", errors });
    }

    const { title, content, category, degreeSlug, degreeId, toolsUsed, links } =
      value;

    let degreeDoc = null;
    if (degreeSlug) {
      degreeDoc = await Degree.findOne({ slug: degreeSlug }).select("_id");
    } else if (degreeId) {
      degreeDoc = await Degree.findById(degreeId).select("_id");
    } else {
      return res.status(400).json({ message: "Debes indicar una carrera" });
    }
    if (!degreeDoc)
      return res.status(400).json({ message: "Carrera no encontrada" });

    const uploadedImages = [];
    const uploadedDocs = [];
    if (Array.isArray(req.files)) {
      req.files.forEach((f) => {
        if (f.mimetype?.startsWith("image/")) {
          uploadedImages.push(`/uploads/imgs/${f.filename}`);
        } else {
          uploadedDocs.push(`/uploads/docs/${f.filename}`);
        }
      });
    }

    const lookingForCollab = category === "colaboradores";

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
      lookingForCollab,
      interestedUsers: [],
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug color" },
      })
      .populate("degree", "name slug color");

    try {
      const { emitToAll } = await import("../src/utils/realtime.js");
      emitToAll("post:created", { post: populatedPost });
    } catch (err) {
      console.error("Error emitiendo post:created:", err);
    }

    return res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Error createPost:", err);
    // Si el error viene de nuestro filtro de groserías, mandamos ese mensaje
    const errorMessage = err.message || "Error al crear post";
    return res.status(500).json({ message: errorMessage });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      // 1. Filtramos posts no reportados
      {
        $match: {
          flagged: { $ne: true },
        },
      },

      // 2. Join con Autor
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // 3. Join con Degrees del Autor
      {
        $lookup: {
          from: "degrees",
          localField: "author.degrees",
          foreignField: "_id",
          as: "author.degrees",
        },
      },

      // 4. Join con la Carrera del POST
      {
        $lookup: {
          from: "degrees",
          localField: "degree",
          foreignField: "_id",
          as: "postDegree",
        },
      },
      {
        $unwind: { path: "$postDegree", preserveNullAndEmptyArrays: true },
      },

      // 👇 5. Buscamos los comentarios reales (Omitimos flagged y lápidas/isDeleted)
      {
        $lookup: {
          from: "comments",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$post", "$$postId"] },
                flagged: { $ne: true }, 
                isDeleted: { $ne: true }, // <--- FIX APLICADO
              },
            },
          ],
          as: "realComments",
        },
      },

      // 6. Proyección Final
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          category: 1,
          createdAt: 1,
          updatedAt: 1,
          likedBy: 1,
          images: 1,
          documents: 1,
          links: 1,
          commentsCount: { $size: "$realComments" },

          degree: {
            _id: "$postDegree._id",
            name: "$postDegree.name",
            slug: "$postDegree.slug",
            color: "$postDegree.color",
          },

          author: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            username: 1,
            profilePicture: 1,
            degrees: {
              _id: 1,
              name: 1,
              color: 1,
            },
          },
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    res.json(posts);
  } catch (error) {
    console.error("Error en getAllPosts:", error);
    res.status(500).json({ message: "Error al obtener publicaciones" });
  }
};

export const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate("author", "username profilePicture")
      .populate("degree", "name color")
      .populate(
        "selectedCollaborators",
        "username firstName lastName profilePicture",
      )
      .sort({ createdAt: -1 });

    const Comment = mongoose.model("Comment");
    const postsWithCounts = await Promise.all(
      posts.map(async (p) => {
        const count = await Comment.countDocuments({
          post: p._id,
          flagged: { $ne: true },
          isDeleted: { $ne: true }, // <--- FIX APLICADO
        });
        return { ...p.toObject(), commentsCount: count };
      }),
    );

    res.json(postsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPostById = async (req, res) => {
  const id = req.params.id || req.params.postId;
  try {
    const post = await Post.findById(id)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug color" },
      })
      .populate("degree", "name slug color")
      .populate(
        "interestedUsers.user",
        "username firstName lastName profilePicture",
      )
      .populate(
        "selectedCollaborators",
        "username firstName lastName profilePicture",
      );

    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    const Comment = mongoose.model("Comment");
    const count = await Comment.countDocuments({
      post: post._id,
      flagged: { $ne: true },
      isDeleted: { $ne: true }, // <--- FIX APLICADO
    });

    const postObj = post.toObject();
    postObj.commentsCount = count; 

    res.json(postObj);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Post no encontrado" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const updatePost = async (req, res) => {
  const id = req.params.id || req.params.postId;
  const userId = req.user._id;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (getSafeId(post.author) !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar este post" });
    }

    const allowedFields = [
      "title",
      "content",
      "category",
      "links",
      "toolsUsed",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (typeof req.body[field] !== "undefined") {
        updates[field] = req.body[field];
      }
    }

    if (typeof req.body.links === "string") {
      try {
        updates.links = JSON.parse(req.body.links);
      } catch {
        updates.links = [];
      }
    } else if (req.body.links) {
      updates.links = req.body.links;
    }

    if (req.body.toolsUsed) updates.toolsUsed = req.body.toolsUsed;

    const updatedPost = await Post.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug color" },
      })
      .populate("degree", "name slug color")
      .populate("interestedUsers.user", "username profilePicture");
    const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");
    const payload = {
      postId: updatedPost._id.toString(),
      post: updatedPost,
    };
    emitToAll("post:updated", payload);
    emitToPost(id, "post:updated", payload);

    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deletePostById = async (req, res) => {
  const id = req.params.id || req.params.postId;
  const userId = req.user._id;
  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });
    if (getSafeId(post.author) !== userId.toString()) {
      return res.status(403).json({ message: "No tienes permiso" });
    }
    await Post.findByIdAndDelete(id);

    const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");
    const payload = { postId: id.toString() };
    emitToPost(id, "post:deleted", payload);
    emitToAll("post:deleted", payload);

    res.json({ message: "Post eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleInterest = async (req, res) => {
  const userId = req.user._id;
  const postId = req.params.id || req.params.postId;

  try {
    const postCheck = await Post.findById(postId)
      .select("interestedUsers title author")
      .lean();
    if (!postCheck)
      return res.status(404).json({ message: "Post no encontrado" });

    const isAlreadyInterested = postCheck.interestedUsers.some(
      (i) => i.user.toString() === userId.toString(),
    );

    let isInterested = false;
    let updatedPost;

    if (isAlreadyInterested) {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { interestedUsers: { user: userId } } },
        { new: true },
      );
      isInterested = false;
    } else {
      updatedPost = await Post.findOneAndUpdate(
        { _id: postId, "interestedUsers.user": { $ne: userId } },
        {
          $push: {
            interestedUsers: {
              user: userId,
              status: "pending",
              date: new Date(),
            },
          },
        },
        { new: true },
      );

      if (!updatedPost) {
        updatedPost = await Post.findById(postId);
        isInterested = true;
      } else {
        isInterested = true;

        if (postCheck.author.toString() !== userId.toString()) {
          const User = mongoose.model("User");
          const [author, actor] = await Promise.all([
            User.findById(postCheck.author),
            User.findById(userId).select("username profilePicture"),
          ]);

          if (author) {
            const notif = {
              type: "interest",
              message: `${actor?.username || "Alguien"} quiere colaborar en “${postCheck.title}”.`,
              post: postId,
              fromUser: userId,
              read: false,
              createdAt: new Date(),
            };

            author.notifications.push(notif);
            await author.save();

            const { emitToUser } = await import("../src/utils/realtime.js");
            const unreadCount = author.notifications.filter(
              (n) => !n.read,
            ).length;
            emitToUser(author._id, "notification", notif);
            emitToUser(author._id, "notifications:count", { unreadCount });
          }
        }
      }
    }

    
    const populatedPost = await Post.findById(postId)
      .populate("author", "username profilePicture")
      .populate("interestedUsers.user", "username profilePicture");

    const { emitToPost, emitToAll } = await import("../src/utils/realtime.js");
    
    // Emitimos las actualizaciones al frontend
    emitToPost(postId, "post:updated", { postId, post: populatedPost });
    if (emitToAll) emitToAll("collab:updated", { postId }); 

    const myInterest = isInterested
      ? populatedPost.interestedUsers.find(
          (i) => i.user?._id?.toString() === userId.toString(),
        )
      : null;

    return res.json({
      interested: isInterested,
      interestedCount: populatedPost.interestedUsers.length,
      myInterest,
    });
  } catch (error) {
    console.error("Error en toggleInterest:", error);
    res.status(500).json({ message: error.message });
  }
};

export const manageCollabRequest = async (req, res) => {
  const { id, userId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user._id;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (post.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: "No eres el autor del post" });
    }

    const interestReq = post.interestedUsers.find(
      (i) => i.user.toString() === userId,
    );

    if (!interestReq) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    interestReq.status = status;
    await post.save();

    const updatedPost = await Post.findById(id)
      .populate("author", "username profilePicture")
      .populate("interestedUsers.user", "username profilePicture");

    // 👇 FIX APLICADO: Importamos emitToAll y disparamos el evento global
    const { emitToPost, emitToUser, emitToAll } = await import("../src/utils/realtime.js");
    
    emitToPost(id, "post:updated", { postId: id, post: updatedPost });
    if (emitToAll) emitToAll("collab:updated", { postId: id }); // Activa el refresh en React

    // 👇 FIX APLICADO: Cambiamos "rechazada" por "declinada"
    const notifMsg =
      status === "accepted"
        ? `¡Felicidades! Fuiste aceptado en "${post.title}".`
        : `Tu solicitud para "${post.title}" fue declinada.`;

    emitToUser(userId, "notification", {
      type: "collab_status",
      message: notifMsg,
      read: false,
      createdAt: new Date(),
    });

    res.json({ message: `Usuario ${status}`, post: updatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error gestionando solicitud" });
  }
};

export const finalizeCollabTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedUserIds } = req.body || {};
    const actorId = req.user._id;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (post.author.toString() !== actorId.toString()) {
      return res.status(403).json({ message: "Solo el autor puede confirmar" });
    }

    const idsToSelect = Array.isArray(selectedUserIds) ? selectedUserIds : [];

    post.interestedUsers.forEach((interest) => {
      const uid = interest.user.toString();
      if (idsToSelect.includes(uid)) {
        interest.status = "accepted";
      } else {
        interest.status = "rejected";
      }
    });

    post.selectedCollaborators = idsToSelect;
    post.collabStatus = "team_chosen";

    await post.save();

    const populatedPost = await Post.findById(id)
      .populate("author", "username profilePicture")
      .populate("interestedUsers.user", "username profilePicture")
      .populate(
        "selectedCollaborators",
        "username firstName lastName profilePicture",
      );

    const { emitToPost } = await import("../src/utils/realtime.js");
    emitToPost(id, "post:updated", { postId: id, post: populatedPost });

    return res.json({ ok: true, post: populatedPost });
  } catch (err) {
    console.error("Error en finalizeCollabTeam:", err);
    res.status(500).json({ message: "No se pudo confirmar el equipo" });
  }
};

export const toggleLike = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    const hasLiked =
      post.likedBy &&
      post.likedBy.some((uid) => uid.toString() === userId.toString());

    let updatedPost;

    if (hasLiked) {
      updatedPost = await Post.findByIdAndUpdate(
        id,
        { $pull: { likedBy: userId } },
        { new: true }, 
      );
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        id,
        { $addToSet: { likedBy: userId } },
        { new: true },
      );

      const postAuthorId = getSafeId(post.author);
      if (postAuthorId !== userId.toString()) {
        const User = mongoose.model("User");
        const [author, actor] = await Promise.all([
          User.findById(postAuthorId),
          User.findById(userId).select("username profilePicture"),
        ]);

        if (author) {
          const notif = {
            type: "LIKE_POST",
            message: `${actor?.username || "Alguien"} le dio like a “${post.title}”.`,
            post: post._id,
            fromUser: userId,
            read: false,
            createdAt: new Date(),
          };
          author.notifications.push(notif);
          await author.save();

          const { emitToUser } = await import("../src/utils/realtime.js");
          const unreadCount = author.notifications.filter(
            (n) => !n.read,
          ).length;
          emitToUser(author._id, "notification", notif);
          emitToUser(author._id, "notifications:count", { unreadCount });
        }
      }
    }

    const { emitToUser, emitToPost, emitToAll } =
      await import("../src/utils/realtime.js");

    const likePayload = {
      postId: updatedPost._id.toString(),
      likesCount: updatedPost.likedBy.length,
      actorId: userId.toString(),
    };

    emitToUser(updatedPost.author, "post:like", likePayload);
    emitToPost(updatedPost._id, "post:like", likePayload);
    if (emitToAll) emitToAll("post:like", likePayload); 

    return res.json({
      liked: !hasLiked,
      likesCount: updatedPost.likedBy.length,
    });
  } catch (error) {
    console.error("Error en toggleLike:", error);
    return res.status(500).json({ message: "Error al dar like" });
  }
};

export const getCategoryStatsByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug }).select("_id");
    if (!degree)
      return res.status(404).json({ message: "Carrera no encontrada" });

    const stats = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          lastPostAt: { $max: "$createdAt" },
        },
      },
      { $project: { _id: 0, category: "$_id", count: 1, lastPostAt: 1 } },
      { $sort: { category: 1 } },
    ]);

    res.json({ items: stats });
  } catch (e) {
    res.status(500).json({ message: "Error obteniendo contadores" });
  }
};

export const getCategoryActivityByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug }).select("_id");
    if (!degree)
      return res.status(404).json({ message: "Carrera no encontrada" });

    const activity = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          lastPostAt: { $max: "$createdAt" },
          authors: { $push: "$author" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
          lastPostAt: 1,
          authors: { $slice: [{ $setUnion: ["$authors", []] }, 3] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authors",
          foreignField: "_id",
          as: "authorDocs",
        },
      },
      {
        $project: {
          category: 1,
          count: 1,
          lastPostAt: 1,
          authors: {
            $map: {
              input: "$authorDocs",
              as: "u",
              in: {
                _id: "$$u._id",
                username: "$$u.username",
                profilePicture: "$$u.profilePicture",
              },
            },
          },
        },
      },
    ]);

    res.json({ items: activity });
  } catch (e) {
    res.status(500).json({ message: "Error obteniendo actividad" });
  }
};

export const getPostsByDegree = async (req, res) => {
  try {
    const { slug } = req.params;
    const { category, limit = 20, cursor } = req.query;

    const degree = await Degree.findOne({ slug })
      .select("_id name slug")
      .lean();
    if (!degree)
      return res.status(404).json({ message: "Carrera no encontrada" });

    const match = { degree: degree._id };
    if (category) match.category = category;
    if (cursor) match.createdAt = { $lt: new Date(cursor) };
    if (!req.user?.role || req.user.role !== "admin") {
      match.flagged = { $ne: true };
    }

    const posts = await Post.find(match)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug color" },
      })
      .populate("degree", "name slug color")
      .populate(
        "selectedCollaborators",
        "username firstName lastName profilePicture",
      );

    const Comment = mongoose.model("Comment");
    const postsWithCounts = await Promise.all(
      posts.map(async (p) => {
        const count = await Comment.countDocuments({
          post: p._id,
          flagged: { $ne: true },
          isDeleted: { $ne: true }, // <--- FIX APLICADO
        });
        return { ...p.toObject(), commentsCount: count };
      }),
    );

    const nextCursor = postsWithCounts.length
      ? postsWithCounts[postsWithCounts.length - 1].createdAt.toISOString()
      : null;

    return res.json({ degree, items: postsWithCounts, nextCursor });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error listando posts por carrera" });
  }
};

export const getReceivedRequests = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  try {
    const requests = await Post.aggregate([
      {
        $match: {
          author: userId,
          "interestedUsers.0": { $exists: true },
        },
      },
      { $unwind: "$interestedUsers" },
      { $match: { "interestedUsers.status": "pending" } },

      {
        $lookup: {
          from: "users",
          localField: "interestedUsers.user",
          foreignField: "_id",
          as: "applicant",
        },
      },
      { $unwind: "$applicant" },

      {
        $lookup: {
          from: "degrees",
          localField: "applicant.degrees", 
          foreignField: "_id",
          as: "applicantDegrees", 
        },
      },

      {
        $group: {
          _id: "$applicant._id",
          applicant: {
            $first: {
              _id: "$applicant._id",
              username: "$applicant.username",
              firstName: "$applicant.firstName",
              lastName: "$applicant.lastName",
              profilePicture: "$applicant.profilePicture",
              degrees: "$applicantDegrees",
            },
          },
          projects: {
            $push: {
              _id: "$_id",
              title: "$title",
              category: "$category",
              requestedAt: "$interestedUsers.date",
            },
          },
          totalRequests: { $sum: 1 },
        },
      },
      { $sort: { totalRequests: -1 } },
    ]);

    res.json(requests);
  } catch (error) {
    console.error("Error en getReceivedRequests:", error);
    res.status(500).json({ message: "Error cargando solicitudes recibidas" });
  }
};

export const getSentRequests = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  try {
    const requests = await Post.aggregate([
      { $match: { "interestedUsers.user": userId } },
      { $unwind: "$interestedUsers" },
      { $match: { "interestedUsers.user": userId } },

      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },

      {
        $lookup: {
          from: "degrees",
          localField: "owner.degrees",
          foreignField: "_id",
          as: "ownerDegrees",
        },
      },

      {
        $project: {
          _id: 1,
          title: 1,
          category: 1,
          status: "$interestedUsers.status",
          date: "$interestedUsers.date",
          owner: {
            _id: "$owner._id",
            username: "$owner.username",
            firstName: "$owner.firstName",
            lastName: "$owner.lastName",
            profilePicture: "$owner.profilePicture",
            degrees: "$ownerDegrees",
          },
        },
      },
      { $sort: { date: -1 } },
    ]);

    res.json(requests);
  } catch (error) {
    console.error("Error en getSentRequests:", error);
    res.status(500).json({ message: "Error cargando postulaciones" });
  }
};

export const closeTeam = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post no encontrado" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para cerrar este equipo" });
    }

    post.collabStatus = "team_chosen";

    let rejectedCount = 0;
    post.interestedUsers.forEach((interest) => {
      if (interest.status === "pending") {
        interest.status = "rejected";
        rejectedCount++;
      }
    });

    await post.save();

    // 👇 FIX APLICADO: Avisamos a toda la app que este equipo se cerró
    try {
      const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");
      if (emitToAll) emitToAll("collab:updated", { postId });
      if (emitToPost) emitToPost(postId, "post:updated", { postId, post });
    } catch (err) {
      console.error("Error emitiendo cierre de equipo:", err);
    }

    res.json({
      message: "Equipo cerrado exitosamente",
      post,
      rejectedCount,
    });
  } catch (error) {
    console.error("Error al cerrar equipo:", error);
    res.status(500).json({ message: "Error del servidor al cerrar equipo" });
  }
};

export const getMyOpenCollabs = async (req, res) => {
  try {
    const userId = req.user._id;
    const posts = await Post.find({
      author: userId,
      category: "colaboradores",
      collabStatus: "open",
    })
      .select("title category collabStatus interestedUsers createdAt degree")
      .sort({ createdAt: -1 })
      .populate("degree", "name color")
      .populate(
        "interestedUsers.user",
        "username firstName lastName profilePicture",
      );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener convocatorias" });
  }
};