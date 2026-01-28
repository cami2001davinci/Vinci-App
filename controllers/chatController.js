import mongoose from "mongoose";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/usersModel.js";
import Post from "../models/postsModel.js";
import ProjectInterest from "../models/projectInterestModel.js";
import { getNotificationCounts } from "../src/utils/notificationCounts.js";

const populateConversation = (query) =>
  query
    .populate("participants", "username firstName lastName profilePicture")
    .populate("participant", "username firstName lastName profilePicture")
    .populate("owner", "username firstName lastName profilePicture")
    .populate("requestedBy", "username firstName lastName profilePicture")
    .populate("post", "title category author")
    .populate("projectInterest", "status");

const asObjectId = (value) => new mongoose.Types.ObjectId(value);

const toStringId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return (
      value._id?.toString?.() ||
      value.id?.toString?.() ||
      value.toString?.() ||
      null
    );
  }
  return value.toString?.() || null;
};

// Ajuste: sincroniza los arrays legacy del post con el modelo de intereses
const refreshPostInterestArrays = async (post) => {
  if (!post) return null;
  const postId = post._id || post.id;
  const [pendingIds, matchedIds] = await Promise.all([
    ProjectInterest.find({ post: postId, status: "pending" }).distinct(
      "interested"
    ),
    ProjectInterest.find({ post: postId, status: "accepted" }).distinct(
      "interested"
    ),
  ]);
  post.interestedUsers = pendingIds;
  post.matchedUsers = matchedIds;
  await post.save();
  return { pendingIds, matchedIds };
};

const loadPostForRealtime = async (postId) => {
  try {
    return await Post.findById(postId)
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
  } catch (err) {
    console.error("Error cargando post para realtime:", err);
    return null;
  }
};

const emitPostUpdated = async (postId, authorId) => {
  try {
    const updated = await loadPostForRealtime(postId);
    if (!updated) return;
    const payload = {
      postId: updated._id.toString(),
      post: updated,
    };
    const realtime = await import("../src/utils/realtime.js");
    realtime.emitToPost(updated._id, "post:updated", payload);
    realtime.emitToAll("post:updated", payload);
    if (authorId) {
      realtime.emitToUser(authorId, "post:updated", payload);
    }
  } catch (err) {
    console.error("Error emitiendo post:updated:", err);
  }
};

const formatConversation = (conversation, currentUserId) => {
  const conv =
    typeof conversation.toObject === "function"
      ? conversation.toObject()
      : conversation;
  const current = currentUserId?.toString();
  const unread =
    Array.isArray(conv.unreadBy) &&
    conv.unreadBy.some((id) => id.toString() === current);

  const otherParticipant =
    Array.isArray(conv.participants) && conv.participants.length === 2
      ? conv.participants.find((p) => p._id?.toString() !== current)
      : null;

  const ownerId = toStringId(conv.owner);
  const requestedById = toStringId(conv.requestedBy);
  const isOwner = ownerId && ownerId === current;
  const isRequester = requestedById && requestedById === current;

  return {
    ...conv,
    unread,
    otherParticipant,
    isOwner,
    isRequester,
    isPendingForOwner: conv.status === "pending" && isOwner,
  };
};

const getOtherParticipantId = (participants, currentUserId) => {
  const current = currentUserId?.toString();
  const other = (participants || []).find(
    (p) => (p?._id || p)?.toString() !== current
  );
  return other?._id || other || null;
};

export const ensureCollabRequestConversation = async ({
  requesterId,       // usuario interesado
  targetUserId,      // dueño del post
  post,              // doc del Post (o {_id,title,author,...})
  projectInterestId, // _id de ProjectInterest
  requestMessage,    // texto opcional
}) => {
  try {
    if (!requesterId || !targetUserId || !post?._id) {
      throw new Error("Faltan datos para crear solicitud de colaboración");
    }

    const ownerObjectId = asObjectId(targetUserId);
    const requesterObjectId = asObjectId(requesterId);

    // siempre mismo orden -> una sola conversación por pareja
    const participants = [ownerObjectId, requesterObjectId]
      .map((p) => asObjectId(p))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    // 1) Buscar o crear conversación directa entre ambos
    let conversation = await Conversation.findOne({
      participants: { $all: participants },
      $expr: { $eq: [{ $size: "$participants" }, participants.length] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        owner: ownerObjectId,
        participant: requesterObjectId,
        post: post._id,
        projectInterest: projectInterestId || null,
        status: "pending",          // aparece como Solicitud
        requestType: "collab",
        requestedBy: requesterObjectId,
        requestMessage: requestMessage || "",
        unreadBy: [ownerObjectId],  // el dueño tiene algo sin leer
        lastMessage: "",
        lastSender: requesterObjectId,
        lastMessageAt: new Date(),
      });
     } else {
      // Ya existía chat entre ellos → lo reutilizamos como solicitud nueva
      // 🔧 IMPORTANTE: forzamos siempre owner = autor del post, participant = interesado
      conversation.owner = ownerObjectId;
      conversation.participant = requesterObjectId;
      conversation.participants = participants;

      // El último proyecto al que hace referencia la solicitud
      conversation.post = post._id;
      if (projectInterestId) {
        conversation.projectInterest = projectInterestId;
      }

      conversation.status = "pending";      // vuelve a estar en Solicitudes
      conversation.requestType = "collab";
      conversation.requestedBy = requesterObjectId;
      if (requestMessage) {
        conversation.requestMessage = requestMessage;
      }

      // aseguramos que el dueЯo figure en unreadBy (sin duplicados)
      const unreadSet = new Set(
        (conversation.unreadBy || []).map((id) => id.toString())
      );
      unreadSet.add(ownerObjectId.toString());
      conversation.unreadBy = Array.from(unreadSet).map(asObjectId);

      await conversation.save();
    }

    // 2) Vincular ProjectInterest con la conversación
    let interestDoc = null;
    if (projectInterestId) {
      interestDoc = await ProjectInterest.findById(projectInterestId);
      if (interestDoc) {
        interestDoc.conversation = conversation._id;
        interestDoc.owner = post.author || ownerObjectId;
        interestDoc.interested = requesterObjectId;
        if (!interestDoc.status || interestDoc.status === "rejected") {
          interestDoc.status = "pending";
        }
        await interestDoc.save();
      }
    }

    // 3) Crear mensaje automático tipo:
    //    "X está interesado en colaborar en "TÍTULO"."
    try {
      const interestedUser = await User.findById(requesterObjectId).select(
        "username firstName lastName"
      );

      const displayName =
        (interestedUser?.firstName || interestedUser?.lastName)
          ? `${interestedUser.firstName || ""} ${
              interestedUser.lastName || ""
            }`.trim()
          : interestedUser?.username || "Alguien";

      const projectTitle = post.title || "tu proyecto";

      // Este texto se usa para detectar el reply estilo WhatsApp en el frontend
      const autoText = `${displayName} está interesado en colaborar en "${projectTitle}".`;

      const message = await Message.create({
        conversation: conversation._id,
        sender: requesterObjectId,
        content: autoText,
        readBy: [requesterObjectId], // el que lo envía ya lo leyó
      });

      // Actualizamos preview de la conversación
      conversation.lastMessage = autoText;
      conversation.lastSender = requesterObjectId;
      conversation.lastMessageAt = message.createdAt;
      await conversation.save();

      // Recargamos la conversación populada y formateada para el dueño
      const populatedConv = await populateConversation(
        Conversation.findById(conversation._id)
      );
      const formattedForOwner = formatConversation(
        populatedConv,
        ownerObjectId
      );

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "username firstName lastName profilePicture")
        .lean();

      // Emitimos al dueño del post para que vea la solicitud en tiempo real
      try {
        const realtime = await import("../src/utils/realtime.js");
        realtime.emitToUser(ownerObjectId.toString(), "chat:message", {
          conversationId: conversation._id,
          message: populatedMessage,
          conversation: formattedForOwner,
        });
        realtime.emitToUser(ownerObjectId.toString(), "collab:request", {
          conversation: formattedForOwner,
          interestId: interestDoc?._id || projectInterestId || null,
          postId: post._id,
        });
      } catch (err) {
        console.error(
          "Error emitiendo chat:message (solicitud de colaboracion):",
          err
        );
      }
    } catch (err) {
      console.error(
        "No se pudo crear mensaje automático de interés:",
        err.message
      );
    }

    return conversation;
  } catch (err) {
    console.error("[ensureCollabRequestConversation] Error:", err);
    throw err;
  }
};




// Crea o reutiliza una conversación directa 1 a 1 entre dos usuarios
export const findOrCreateDirectConversation = async (
  userA,
  userB,
  { postId = null, ownerId = null, participantId = null, forceActive = false } = {}
) => {
  const ids = [userA, userB].map((id) => id.toString()).sort();
  const participants = ids.map(asObjectId);

  // FIX: una sola conversacion por par de usuarios (post solo como metadata)
  let conversation = await Conversation.findOne({ participants });

  if (!conversation) {
    // No existe -> la creamos
    conversation = await Conversation.create({
      participants,
      post: postId || null,
      owner: ownerId || null,
      participant: participantId ? asObjectId(participantId) : null,
      status: forceActive ? "active" : "pending",
      requestType: postId ? "collab" : "dm",
      requestedBy: participantId ? asObjectId(participantId) : null,
      requestMessage: null,
      unreadBy: [],
      lastMessageAt: new Date(),
    });
  } else {
    // Ya existe -> actualizamos datos extra si faltan
    let changed = false;

    if (postId && !conversation.post) {
      conversation.post = postId;
      changed = true;
    }

    if (ownerId && !conversation.owner) {
      conversation.owner = ownerId;
      changed = true;
    }

    if (participantId && !conversation.participant) {
      conversation.participant = asObjectId(participantId);
      changed = true;
    }

    if (forceActive && conversation.status === "pending") {
      conversation.status = "active";
      changed = true;
    }

    if (changed) {
      await conversation.save();
    }
  }

  // Devolvemos la conversacion populada
  return populateConversation(Conversation.findById(conversation._id));
};


export const listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await populateConversation(
      Conversation.find({ participants: userId, status: { $ne: 'ignored' } })
        .sort({ updatedAt: -1 })
        .limit(100)
    );

    const formatted = conversations.map((c) => formatConversation(c, userId));
    const active = formatted.filter((c) => c.status !== "pending");
    // Solo el owner del post ve las solicitudes pendientes
    const requests = formatted.filter((c) => c.isPendingForOwner);

    res.json({ conversations: active, requests });
  } catch (err) {
    console.error('Error listConversations:', err);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};


export const startConversationWithUser = async (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.params.userId;
    if (!targetUserId) {
      return res.status(400).json({ message: 'Falta targetUserId en la solicitud' });
    }

    const [targetUser, post] = await Promise.all([
      User.findById(targetUserId).select('username profilePicture firstName lastName'),
      req.body.postId || req.query.postId
        ? Post.findById(req.body.postId || req.query.postId).select('author category title')
        : null,
    ]);
    if (!targetUser) return res.status(404).json({ message: 'Usuario destino no encontrado' });

    const ownerId = post?.author || null;
    const participantId =
      ownerId && ownerId.toString() === req.user._id.toString()
        ? targetUserId
        : ownerId
        ? req.user._id
        : null;

    // Ajuste: si viene un post, generamos el chat atado a ese post/owner/participant
    const conversation = await findOrCreateDirectConversation(
      req.user._id,
      targetUserId,
      {
        postId: post?._id || null,
        ownerId,
        participantId,
        forceActive: true,
      }
    );

    const formatted = formatConversation(
      await populateConversation(Conversation.findById(conversation._id || conversation.id)),
      req.user._id
    );

    res.status(201).json({ conversation: formatted });
  } catch (err) {
    console.error('Error startConversationWithUser:', err);
    res.status(500).json({ message: 'No se pudo iniciar el chat' });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Number(req.query.limit) || 50;

    // Traemos la conversación con participantes y, si quieres, el post
    const conversation = await populateConversation(
      Conversation.findById(conversationId)
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversacion no encontrada" });
    }

    // Verificamos que el usuario forme parte
    const isParticipant = (conversation.participants || []).some((p) => {
      const pid = p && p._id ? p._id : p;
      return pid?.toString() === req.user._id.toString();
    });

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "No tienes acceso a esta conversacion" });
    }

    // Traemos mensajes ordenados del más viejo al más nuevo
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("sender", "username firstName lastName profilePicture")
      .lean();

    // Marcamos mensajes como leídos para este usuario
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Sacamos al usuario de unreadBy SIN tocar la versión del documento
    await Conversation.updateOne(
      { _id: conversationId },
      { $pull: { unreadBy: req.user._id } }
    );

    res.json({
      conversation: formatConversation(conversation, req.user._id),
      messages,
    });
  } catch (err) {
    console.error("Error getMessages:", err);
    res.status(500).json({ message: "Error al obtener mensajes" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "El mensaje no puede estar vacio" });
    }

    const conversation = await populateConversation(
      Conversation.findById(conversationId)
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversacion no encontrada" });
    }

    const isParticipant = conversation.participants.some(
      (id) => id._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "No formas parte de esta conversacion" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });

    conversation.lastMessage = content.trim();
    conversation.lastSender = req.user._id;
    conversation.lastMessageAt = new Date();
    conversation.unreadBy = conversation.participants
      .map((p) => p._id?.toString() || p.toString())
      .filter((id) => id !== req.user._id.toString())
      .map(asObjectId);
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username firstName lastName profilePicture")
      .lean();

    const formattedConversation = formatConversation(
      await populateConversation(
        Conversation.findById(conversationId)
      ),
      req.user._id
    );

    try {
      const realtime = await import("../src/utils/realtime.js");
      conversation.participants.forEach((p) => {
        realtime.emitToUser(p._id || p, "chat:message", {
          conversationId,
          message: populatedMessage,
          conversation: formattedConversation,
        });
      });
    } catch (err) {
      console.error("Error emitiendo chat:message:", err);
    }

    res.status(201).json({
      message: populatedMessage,
      conversation: formattedConversation,
    });
  } catch (err) {
    console.error("Error sendMessage:", err);
    res.status(500).json({ message: "No se pudo enviar el mensaje" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ message: "Conversacion no encontrada" });
    }

    const isParticipant = (conversation.participants || []).some((p) => {
      const pid = p && p._id ? p._id.toString() : p.toString();
      return pid === req.user._id.toString();
    });

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "No formas parte de esta conversacion" });
    }

    // Cambio: usamos updates atómicos para evitar VersionError al guardar el doc cargado
    await Promise.all([
      Conversation.updateOne(
        { _id: conversationId, participants: req.user._id },
        { $pull: { unreadBy: req.user._id } }
      ),
      Message.updateMany(
        { conversation: conversationId, readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id } }
      ),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error markConversationRead:", err);
    const status =
      err instanceof mongoose.Error.CastError || err?.name === "CastError"
        ? 400
        : 500;
    res.status(status).json({ message: "No se pudo marcar la conversacion" });
  }
};

// Ajuste: permitir ignorar una solicitud de colaboracion sin duplicar rutas
export const ignoreCollaboration = async (req, res) => {
  try {
    const { requestId } = req.params;
    const actorId = req.user._id;

    const conversation = await Conversation.findById(requestId)
      .populate("participants", "username firstName lastName profilePicture")
      .populate("post", "title category author")
      .populate("projectInterest");

    if (!conversation) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    const otherId = getOtherParticipantId(conversation.participants, actorId);

    if (
      conversation.post &&
      conversation.post.author &&
      conversation.post.author.toString() !== actorId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Solo el autor del post puede ignorar la solicitud" });
    }

    // Marcamos la conversacion como ignorada
    conversation.status = "ignored";
    conversation.ignoredAt = new Date();
    conversation.unreadBy = [];
    await conversation.save();

    // Si hay registro de interes, lo pasamos a rechazado
    let projectInterest = null;
    if (conversation.projectInterest) {
      projectInterest = await ProjectInterest.findById(
        conversation.projectInterest
      );
    } else if (conversation.post && otherId) {
      projectInterest = await ProjectInterest.findOne({
        post: conversation.post,
        owner: conversation.post.author || conversation.owner,
        interested: otherId,
      });
    }
    if (projectInterest) {
      projectInterest.status = "rejected";
      await projectInterest.save();
    }

    let post = null;
    if (conversation.post) {
      post = await Post.findById(conversation.post);
      if (post) {
        await refreshPostInterestArrays(post);
        await emitPostUpdated(post._id, post.author);
      }
    }

    const formatted = formatConversation(
      await populateConversation(Conversation.findById(conversation._id)),
      actorId
    );

    try {
      const realtime = await import("../src/utils/realtime.js");
      const payload = {
        conversationId: conversation._id,
        status: "ignored",
        postId: post?._id || conversation.post || null,
        ownerId: post?.author || conversation.owner || null,
        interestedId: otherId,
        interestId: projectInterest?._id || null,
      };
      [otherId, actorId].forEach((uid) => {
        if (uid) {
          realtime.emitToUser(uid, "collab:ignored", payload);
        }
      });
    } catch (err) {
      console.error("Error emitiendo collab:ignored:", err);
    }

    return res.json({ ok: true, conversation: formatted });
  } catch (err) {
    console.error("Error en ignoreCollaboration:", err);
    res.status(500).json({ message: "No se pudo ignorar la solicitud" });
  }
};

export const acceptCollaboration = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const actorId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "username firstName lastName profilePicture")
      .populate("post", "title category author")
      .populate("projectInterest", "status post owner interested conversation");
    if (!conversation) {
      return res.status(404).json({ message: "Conversacion no encontrada" });
    }

    if (!Array.isArray(conversation.participants) || conversation.participants.length < 2) {
      return res
        .status(400)
        .json({ message: "La conversacion no tiene los participantes requeridos" });
    }

    const otherId = getOtherParticipantId(conversation.participants, actorId);
    if (!otherId) {
      return res
        .status(400)
        .json({ message: "No hay otro participante en este chat" });
    }

    if (!conversation.post) {
      return res
        .status(400)
        .json({ message: "La conversacion no esta asociada a un post" });
    }

    const post = await Post.findById(conversation.post);
    if (!post) {
      return res
        .status(404)
        .json({ message: "Post vinculado no encontrado" });
    }

    if (post.category !== "colaboradores") {
      return res.status(400).json({
        message: "Solo se puede aceptar colaboracion en posts de colaboradores",
      });
    }

    const postAuthorId = post.author.toString();
    const actorIdStr = actorId.toString();

    if (postAuthorId !== actorIdStr) {
      return res
        .status(403)
        .json({ message: "Solo el autor del post puede aceptar colaboraciones" });
    }

    const ownerObjectId = asObjectId(postAuthorId);
    const participantObjectId = asObjectId(otherId);

    conversation.owner = ownerObjectId;
    conversation.participant = participantObjectId;
    conversation.participants = [ownerObjectId, participantObjectId].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );
    conversation.post = post._id;
    conversation.requestType = "collab";

    let projectInterest =
      conversation.projectInterest &&
      (await ProjectInterest.findById(conversation.projectInterest));
    if (!projectInterest) {
      projectInterest = await ProjectInterest.findOne({
        post: post._id,
        interested: otherId,
      });
    }

    if (!projectInterest) {
      projectInterest = await ProjectInterest.create({
        post: post._id,
        owner: ownerObjectId,
        interested: participantObjectId,
        status: "accepted",
        conversation: conversation._id,
      });
    } else {
      projectInterest.owner = ownerObjectId;
      projectInterest.interested = participantObjectId;
      projectInterest.status = "accepted";
      projectInterest.conversation = conversation._id;
      await projectInterest.save();
    }
    conversation.projectInterest = projectInterest?._id || conversation.projectInterest;

    // Si el match se aprueba, el chat debe pasar a activo y dejar de aparecer como solicitud
    conversation.status = "active";
    conversation.acceptedAt = new Date();
    if (!conversation.requestedBy) {
      conversation.requestedBy = asObjectId(otherId);
    }
    await conversation.save();

    await refreshPostInterestArrays(post);
    await emitPostUpdated(post._id, post.author);

    const [authorUser, targetUser] = await Promise.all([
      User.findById(actorId).select(
        "username profilePicture firstName lastName"
      ),
      User.findById(otherId).select(
        "username profilePicture firstName lastName"
      ),
    ]);

    const autoMessage = `${
      authorUser?.username || "Alguien"
    } acepto tu interes en "${post.title}".`;

    const message = await sendSystemMessage({
      conversationId,
      senderId: actorId,
      content: autoMessage,
      // Nuevo: mensaje de sistema con meta del proyecto
      markUnreadFor: [otherId],
      isSystem: true,
      meta: {
        kind: "collab-accept",
        postId: post._id,
        postTitle: post.title,
      },
    });

    const formattedConversation = formatConversation(
      await populateConversation(Conversation.findById(conversationId)),
      actorId
    );

    try {
      const realtime = await import("../src/utils/realtime.js");
      const payload = {
        conversationId,
        message,
        conversation: formattedConversation,
      };

      // Solo emitimos por usuario
      conversation.participants.forEach((p) => {
        realtime.emitToUser(p._id || p, "chat:message", payload);
      });

      const matchPayload = {
        conversationId,
        conversation: formattedConversation,
        postId: post._id,
        interestId: projectInterest?._id || null,
        status: "accepted",
      };
      realtime.emitToUser(actorId, "project:match", matchPayload);
      realtime.emitToUser(otherId, "project:match", matchPayload);
    } catch (err) {
      console.error("Error emitiendo chat:message (acceptCollaboration):", err);
    }

    if (targetUser) {
      // Aseguramos que notifications sea un array
      if (!Array.isArray(targetUser.notifications)) {
        targetUser.notifications = [];
      }

      const notif = {
        type: "MATCH",
        message: `${authorUser?.username || "Alguien"} acepto tu interes en "${post.title}".`,
        post: post._id,
        fromUser: actorId,
        fromUserName: authorUser?.username || "",
        fromUserAvatar: authorUser?.profilePicture || "",
        entity: { kind: "conversation", id: conversationId },
        data: {
          conversationId,
          postId: post._id,
          type: "match",
        },
        read: false,
        createdAt: new Date(),
      };

      targetUser.notifications.push(notif);
      await targetUser.save();

      const counts = getNotificationCounts(targetUser);
      try {
        const realtime = await import("../src/utils/realtime.js");
        realtime.emitToUser(targetUser._id, "notification", notif);
        realtime.emitToUser(targetUser._id, "notification:new", notif);
        realtime.emitToUser(targetUser._id, "notifications:count", counts);
      } catch (err) {
        console.error("Error emitiendo notificacion MATCH:", err);
      }
    }

    res.json({
      conversation: formattedConversation,
      message,
      interest: projectInterest
        ? {
            _id: projectInterest._id,
            status: projectInterest.status,
            conversation: projectInterest.conversation,
          }
        : null,
      post: {
        _id: post._id,
        title: post.title,
        interestedUsers: post.interestedUsers,
        matchedUsers: post.matchedUsers,
      },
    });
  } catch (err) {
    console.error("Error en acceptCollaboration:", err);
    res.status(500).json({ message: "No se pudo aceptar la colaboracion" });
  }
};


export const sendSystemMessage = async ({
  conversationId,
  senderId,
  content,
  markUnreadFor,
  meta = {},
  isSystem = false,
}) => {
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content,
    isSystem,
    meta,
    readBy: [senderId],
  });

  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    conversation.lastMessage = content;
    conversation.lastSender = senderId;
    conversation.lastMessageAt = new Date();
    conversation.unreadBy = (markUnreadFor || []).map(asObjectId);
    await conversation.save();
  }

  return Message.findById(message._id)
    .populate("sender", "username firstName lastName profilePicture")
    .lean();
};

// utilidades compartidas
export { emitPostUpdated, loadPostForRealtime };
