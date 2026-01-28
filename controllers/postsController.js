import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";
import Degree from "../models/degreesModel.js";
import { createPostSchema } from "../validations/postAndCommentValidation.js";
import { getNotificationCounts } from "../src/utils/notificationCounts.js";

// Helper: Obtener ID seguro (string)
const getSafeId = (entity) => {
  return entity?._id ? entity._id.toString() : entity?.toString();
};

export const flagPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByIdAndUpdate(
      postId,
      { flagged: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post no encontrado" });
    res.json({ message: "Post marcado como inapropiado", post });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const { title, content, category, degreeSlug, degreeId, toolsUsed, links } = value;

    let degreeDoc = null;
    if (degreeSlug) {
      degreeDoc = await Degree.findOne({ slug: degreeSlug }).select("_id");
    } else if (degreeId) {
      degreeDoc = await Degree.findById(degreeId).select("_id");
    } else {
      return res.status(400).json({ message: "Debes indicar una carrera" });
    }
    if (!degreeDoc) return res.status(400).json({ message: "Carrera no encontrada" });

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
      interestedUsers: [] // Inicializamos vacío
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      })
      .populate("degree", "name slug");

    try {
      const { emitToAll } = await import("../src/utils/realtime.js");
      emitToAll("post:created", { post: populatedPost });
    } catch (err) {
      console.error("Error emitiendo post:created:", err);
    }

    return res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Error createPost:", err);
    return res.status(500).json({ message: "Error al crear post" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const { limit = 20, cursor, category } = req.query;
    const match = {};
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
        populate: { path: "degrees", select: "name slug" },
      })
      .populate("degree", "name slug")
      // NO populamos interestedUsers aquí para no hacer la carga pesada en el home
      .populate("selectedCollaborators", "username firstName lastName profilePicture");

    return res.json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error cargando posts" });
  }
};

export const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate("author", "username profilePicture")
      .populate("degree", "name")
      .populate("selectedCollaborators", "username firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;
    // Aquí sí populamos los interesados para que el dueño vea la lista al entrar
    const post = await Post.findById(postId)
      .populate({
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      })
      .populate("degree", "name slug")
      .populate("interestedUsers.user", "username firstName lastName profilePicture")
      .populate("selectedCollaborators", "username firstName lastName profilePicture");

    if (!post) return res.status(404).json({ message: "Post no encontrado" });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePost = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (getSafeId(post.author) !== userId.toString()) {
      return res.status(403).json({ message: "No tienes permiso para editar este post" });
    }

    const allowedFields = ["title", "content", "category", "links", "toolsUsed"];
    const updates = {};
    // ... (Tu lógica de validación de campos se mantiene igual)
    for (const field of allowedFields) {
        if (typeof req.body[field] !== "undefined") {
          updates[field] = req.body[field];
        }
    }
    // ... (Logica de parseo de JSON links/toolsUsed se mantiene igual)
    if (typeof req.body.links === "string") {
        try { updates.links = JSON.parse(req.body.links); } catch { updates.links = []; }
    } else if (req.body.links) { updates.links = req.body.links; }

    if (req.body.toolsUsed) updates.toolsUsed = req.body.toolsUsed;

    const updatedPost = await Post.findByIdAndUpdate(postId, updates, {
      new: true,
      runValidators: true,
    })
      .populate("author", "username firstName lastName profilePicture")
      .populate("degree", "name slug")
      .populate("interestedUsers.user", "username profilePicture"); // Importante para realtime

    // Emitir update
    const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");
    const payload = {
      postId: updatedPost._id.toString(),
      post: updatedPost,
    };
    emitToAll("post:updated", payload);
    emitToPost(postId, "post:updated", payload);

    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deletePostById = async (req, res) => {
  // ... (Tu lógica existente está bien)
  const postId = req.params.postId;
  const userId = req.user._id;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });
    if (getSafeId(post.author) !== userId.toString()) {
      return res.status(403).json({ message: "No tienes permiso" });
    }
    await Post.findByIdAndDelete(postId);
    
    // Realtime cleanup
    const { emitToAll, emitToPost } = await import("../src/utils/realtime.js");
    const payload = { postId: postId.toString() };
    emitToPost(postId, "post:deleted", payload);
    emitToAll("post:deleted", payload);

    res.json({ message: "Post eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚀 LÓGICA DE COLLABORATION / MATCH (FIX)
// ==========================================

// 1. Solicitar colaboración (Toggle)
export const toggleInterest = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    // Buscar en el array de subdocumentos
    const existingIndex = post.interestedUsers.findIndex(
      (i) => i.user.toString() === userId.toString()
    );

    let isInterested = false;

    if (existingIndex !== -1) {
      // Si ya existe, lo quitamos
      post.interestedUsers.splice(existingIndex, 1);
    } else {
      // Si no existe, agregamos con estado 'pending'
      post.interestedUsers.push({ user: userId, status: 'pending' });
      isInterested = true;

      // Notificación al autor
      if (post.author.toString() !== userId.toString()) {
         const [author, actor] = await Promise.all([
          User.findById(post.author),
          User.findById(userId).select("username profilePicture"),
        ]);
        if(author) {
            const notif = {
                type: "interest",
                message: `${actor?.username || "Alguien"} quiere colaborar en “${post.title}”.`,
                post: post._id,
                fromUser: userId,
                read: false,
                createdAt: new Date()
            };
            author.notifications.push(notif);
            await author.save();
            
            // Emitir notif socket
            const { emitToUser } = await import("../src/utils/realtime.js");
            const unreadCount = author.notifications.filter(n => !n.read).length;
            emitToUser(author._id, "notification", notif);
            emitToUser(author._id, "notifications:count", { unreadCount });
        }
      }
    }

    await post.save();
    
    // Repopular y emitir
    const updatedPost = await Post.findById(postId)
      .populate("author", "username profilePicture")
      .populate("interestedUsers.user", "username profilePicture");

    const { emitToPost } = await import("../src/utils/realtime.js");
    emitToPost(postId, "post:updated", { postId, post: updatedPost });

    return res.json({
      interested: isInterested,
      interestedCount: post.interestedUsers.length,
      // Devolvemos el objeto de interés actualizado
      myInterest: isInterested ? post.interestedUsers[post.interestedUsers.length - 1] : null
    });

  } catch (error) {
    console.error("Error en toggleInterest:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Gestionar solicitud (Aceptar/Rechazar individualmente)
// Reemplaza a 'acceptInterest' y 'acceptCollaborator'
export const manageCollabRequest = async (req, res) => {
  const { postId, userId } = req.params; 
  const { status } = req.body; // 'accepted' o 'rejected'
  const currentUserId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (post.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: "No eres el autor del post" });
    }

    const interestReq = post.interestedUsers.find(
      (i) => i.user.toString() === userId
    );

    if (!interestReq) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    interestReq.status = status;
    await post.save();

    // Repopular para realtime
    const updatedPost = await Post.findById(postId)
      .populate("author", "username profilePicture")
      .populate("interestedUsers.user", "username profilePicture");

    const { emitToPost, emitToUser } = await import("../src/utils/realtime.js");
    
    // Actualizar UI del post
    emitToPost(postId, "post:updated", { postId, post: updatedPost });

    // Notificar al usuario afectado
    const notifMsg = status === 'accepted' 
      ? `¡Felicidades! Fuiste aceptado en "${post.title}".`
      : `Tu solicitud para "${post.title}" fue rechazada.`;
      
    emitToUser(userId, "notification", {
      type: "collab_status",
      message: notifMsg,
      read: false,
      createdAt: new Date()
    });

    res.json({ message: `Usuario ${status}`, post: updatedPost });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error gestionando solicitud" });
  }
};

// 3. Confirmar equipo final (Cierra la convocatoria)
// Actualizado para usar el modelo embebido
export const finalizeCollabTeam = async (req, res) => {
  try {
    const { postId } = req.params;
    const { selectedUserIds } = req.body || {}; 
    const actorId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (post.author.toString() !== actorId.toString()) {
      return res.status(403).json({ message: "Solo el autor puede confirmar" });
    }

    const idsToSelect = Array.isArray(selectedUserIds) ? selectedUserIds : [];
    
    // Validar que los usuarios seleccionados estén en la lista de interesados aceptados
    // Opcional: Podrías forzar el estado 'accepted' aquí si no lo estaba
    
    // Actualizar estados masivamente en el array local
    post.interestedUsers.forEach(interest => {
        const uid = interest.user.toString();
        if (idsToSelect.includes(uid)) {
            interest.status = 'accepted';
        } else {
            // Si no fue seleccionado, pasa a rejected (o se queda pending/rejected)
            // Generalmente al cerrar equipo, los demás se rechazan
            interest.status = 'rejected';
        }
    });

    // Guardar en el campo selectedCollaborators para acceso rápido
    post.selectedCollaborators = idsToSelect;
    post.collabStatus = "team_chosen";
    
    await post.save();

    const populatedPost = await Post.findById(postId)
        .populate("author", "username profilePicture")
        .populate("interestedUsers.user", "username profilePicture")
        .populate("selectedCollaborators", "username firstName lastName profilePicture");

    const { emitToPost } = await import("../src/utils/realtime.js");
    emitToPost(postId, "post:updated", { postId, post: populatedPost });

    return res.json({ ok: true, post: populatedPost });

  } catch (err) {
    console.error("Error en finalizeCollabTeam:", err);
    res.status(500).json({ message: "No se pudo confirmar el equipo" });
  }
};

// ... (El resto de funciones como toggleLike, getCategoryStatsByDegree, etc. están bien y se mantienen)

export const toggleLike = async (req, res) => {
    // ... Tu código existente para likes está correcto ...
    // (Pégalo aquí si no lo tienes, pero en tu archivo enviado estaba bien)
     const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado" });

    if (!Array.isArray(post.likedBy)) post.likedBy = [];

    const hasLiked = post.likedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (hasLiked) {
      post.likedBy = post.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      post.likedBy.push(userId);
      // Notificación al autor
      const postAuthorId = getSafeId(post.author);
      if (postAuthorId !== userId.toString()) {
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

            // Emitir socket notif
          const { emitToUser } = await import("../src/utils/realtime.js");
          const unreadCount = author.notifications.filter(n => !n.read).length;
          emitToUser(author._id, "notification", notif);
          emitToUser(author._id, "notifications:count", { unreadCount });
        }
      }
    }

    await post.save();

    const { emitToUser, emitToPost } = await import("../src/utils/realtime.js");
    const likePayload = {
      postId: post._id.toString(),
      likesCount: post.likedBy.length,
      actorId: userId.toString(),
    };

    emitToUser(post.author, "post:like", likePayload);
    emitToPost(post._id, "post:like", likePayload);

    return res.json({
      liked: !hasLiked,
      likesCount: post.likedBy.length,
    });
  } catch (error) {
    console.error("Error en toggleLike:", error);
    return res.status(500).json({ message: "Error al dar like" });
  }
};

export const getCategoryStatsByDegree = async (req, res) => {
    // ... Mantiene tu lógica original ...
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
    // ... Mantiene tu lógica original ...
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
    // ... Mantiene tu lógica original ...
      try {
    const { slug } = req.params;
    const { category, limit = 20, cursor } = req.query;

    const degree = await Degree.findOne({ slug })
      .select("_id name slug")
      .lean();
    if (!degree) {
      return res.status(404).json({ message: "Carrera no encontrada" });
    }

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
        populate: { path: "degrees", select: "name slug" },
      })
      .populate("degree", "name slug")
      .populate(
        "selectedCollaborators",
        "username firstName lastName profilePicture"
      );

    const nextCursor = posts.length
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    return res.json({ degree, items: posts, nextCursor });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error listando posts por carrera" });
  }
};