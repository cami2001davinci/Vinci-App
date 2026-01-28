import express from "express";
import { protect } from "../Middleware/auth.js";
import {
  listConversations,
  startConversationWithUser,
  getMessages,
  sendMessage,
  markConversationRead,
  acceptCollaboration,
  ignoreCollaboration,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/", protect, listConversations);
router.post("/with/:userId", protect, startConversationWithUser);
router.post("/with", protect, startConversationWithUser);

router.post("/requests/:conversationId/accept", protect, acceptCollaboration);
router.post("/:conversationId/accept-collab", protect, acceptCollaboration);
// Ajuste: nueva ruta para ignorar solicitudes de colaboracion
router.post("/requests/:requestId/ignore", protect, ignoreCollaboration);

router.get("/:conversationId/messages", protect, getMessages);
router.post("/:conversationId/messages", protect, sendMessage);
router.put("/:conversationId/read", protect, markConversationRead);

export default router;
