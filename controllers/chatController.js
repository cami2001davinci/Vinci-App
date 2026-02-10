import mongoose from "mongoose";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import User from "../models/usersModel.js";
import Post from "../models/postsModel.js";

// Helper para IDs
const asObjectId = (value) => new mongoose.Types.ObjectId(value);

// Populate estándar simplificado (sin dependencias a projectInterest)
const populateConversation = (query) =>
  query.populate("participants", "username firstName lastName profilePicture");

const formatConversation = (conversation, currentUserId) => {
  const conv = conversation.toObject ? conversation.toObject() : conversation;
  const current = currentUserId?.toString();
  
  const unread = Array.isArray(conv.unreadBy) && 
                 conv.unreadBy.some(id => id.toString() === current);

  const otherParticipant = (conv.participants || []).find(
    (p) => (p._id || p).toString() !== current
  );

  return {
    ...conv,
    unread,
    otherParticipant,
    // Eliminamos flags complejos de "owner" o "requester" ya que ahora es par a par
  };
};

export const findOrCreateDirectConversation = async (userA, userB, session = null) => {
  try {
    if (!userA || !userB) throw new Error("Faltan participantes");

    // Configurar opciones si estamos en una transacción
    const opts = session ? { session } : {};

    // Ordenar IDs para consistencia del índice (A,B es igual a B,A)
    const participants = [asObjectId(userA), asObjectId(userB)].sort((a, b) => 
      a.toString().localeCompare(b.toString())
    );

    // 1. Buscar existente (usando la sesión si existe)
    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    }).session(session);

    // 2. Si no existe, crear
    if (!conversation) {
      // Nota: Para transacciones, .create requiere ([docs], options)
      const created = await Conversation.create([{
        participants,
        unreadBy: [],
        lastMessageAt: new Date(),
      }], opts);
      
      conversation = created[0];
    }

    // 3. Devolver populado (encadenando la sesión)
    return populateConversation(Conversation.findById(conversation._id).session(session));
    
  } catch (err) {
    console.error("Error en findOrCreateDirectConversation:", err);
    throw err;
  }
};

// --- ENDPOINTS ---

export const listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    // Traer conversaciones donde el usuario es participante
    const conversations = await populateConversation(
      Conversation.find({ participants: userId })
        .sort({ updatedAt: -1 })
        .limit(50)
    );

    const formatted = conversations.map((c) => formatConversation(c, userId));
    
    // En la nueva arquitectura, no separamos "requests" de "active" a nivel de DB.
    // Todo va al inbox principal por ahora (Fase 1).
    res.json({ conversations: formatted, requests: [] }); 
  } catch (err) {
    console.error('Error listConversations:', err);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};

export const startConversationWithUser = async (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.params.userId;
    if (!targetUserId) {
      return res.status(400).json({ message: 'Falta targetUserId' });
    }

    const conversation = await findOrCreateDirectConversation(req.user._id, targetUserId);
    const formatted = formatConversation(conversation, req.user._id);

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

    const conversation = await populateConversation(Conversation.findById(conversationId));
    if (!conversation) return res.status(404).json({ message: "Conversacion no encontrada" });

    // Mensajes
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("sender", "username firstName lastName profilePicture")
      .lean();

    // Marcar leído (sacar al usuario actual de unreadBy)
    await Conversation.updateOne(
      { _id: conversationId },
      { $pull: { unreadBy: req.user._id } }
    );
    
    // (Opcional) Marcar mensajes individuales como leídos aquí también
    
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
    
    if (!content?.trim()) return res.status(400).json({ message: "Mensaje vacío" });

    // 1. Verificar existencia sin popular (rápido)
    let conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "No encontrado" });

    // 2. Crear Mensaje
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });

    // 3. Actualizar Conversación
    const otherParticipants = conversation.participants
      .filter(id => id.toString() !== req.user._id.toString());

    conversation.lastMessage = content.trim();
    conversation.lastSender = req.user._id;
    conversation.lastMessageAt = new Date();
    conversation.unreadBy = otherParticipants;
    await conversation.save();

    // 4. (CRÍTICO) Repopular la conversación antes de devolverla
    // Esto evita que el frontend reciba solo IDs y pierda los nombres ("Usuario")
    const populatedConversation = await populateConversation(
      Conversation.findById(conversationId)
    );

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username firstName lastName profilePicture")
      .lean();

    const formattedConversation = formatConversation(populatedConversation, req.user._id);

    // 5. Emitir Realtime
    try {
        const realtime = await import("../src/utils/realtime.js");
        conversation.participants.forEach((pid) => {
            realtime.emitToUser(pid.toString(), "chat:message", {
                conversationId,
                message: populatedMessage,
                conversation: formattedConversation
            });
        });
    } catch (e) { console.error(e); }

    // 6. Responder
    res.status(201).json({
      message: populatedMessage,
      conversation: formattedConversation // Ahora sí lleva nombres y fotos
    });

  } catch (err) {
    console.error("Error sendMessage:", err);
    res.status(500).json({ message: "Error al enviar mensaje" });
  }
};

export const markConversationRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        await Conversation.updateOne(
            { _id: conversationId },
            { $pull: { unreadBy: req.user._id } }
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: "Error marcando leido" });
    }
};

// Stub temporal para evitar que rompan rutas viejas si las hay
export const ignoreCollaboration = async (req, res) => res.json({ ok: true });
export const acceptCollaboration = async (req, res) => res.json({ ok: true });