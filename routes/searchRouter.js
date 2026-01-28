// routes/searchRoutes.js
import express from "express";
import { protect } from "../Middleware/auth.js";
import {
  searchPosts,
  searchUsers,
  searchMedia,
} from "../controllers/searchController.js";

const router = express.Router();

router.get("/posts", protect, searchPosts);
router.get("/users", protect, searchUsers);
router.get("/media", protect, searchMedia);

export default router;
