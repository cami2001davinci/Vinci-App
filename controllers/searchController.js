// controllers/searchController.js
import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";

/**
 * GET /search/posts?q=...&tab=destacados|recientes
 * - destacados: ordena por score de interaccion
 * - recientes: ordena por fecha desc
 */
export const searchPosts = async (req, res) => {
  try {
    const { q = "", tab = "destacados", limit = 20, page = 1 } = req.query;
    const term = q.toString().trim();
    const tabKey = tab.toString().toLowerCase();
    const limitNum = Number(limit) > 0 ? Number(limit) : 20;
    const pageNum = Number(page) > 0 ? Number(page) : 1;

    const match = {};

    if (term) {
      match.$or = [
        { title: { $regex: term, $options: "i" } },
        { content: { $regex: term, $options: "i" } },
      ];
    }

    if (!req.user?.role || req.user.role !== "admin") {
      match.flagged = { $ne: true };
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likedBy", []] } },
          commentsCount: { $size: { $ifNull: ["$comments", []] } },
        },
      },
      {
        $addFields: {
          interactionScore: {
            $add: [{ $multiply: ["$likesCount", 2] }, "$commentsCount"],
          },
        },
      },
    ];

    const sortStage =
      tabKey === "recientes"
        ? { createdAt: -1, _id: -1 }
        : { interactionScore: -1, createdAt: -1, _id: -1 };

    pipeline.push(
      { $sort: sortStage },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    );

    const docs = await Post.aggregate(pipeline);

    const posts = await Post.populate(docs, [
      {
        path: "author",
        select: "username firstName lastName profilePicture degrees",
        populate: { path: "degrees", select: "name slug" },
      },
      { path: "degree", select: "name slug" },
      {
        path: "selectedCollaborators",
        select: "username firstName lastName profilePicture",
      },
    ]);

    res.json(posts);
  } catch (err) {
    console.error("Error en searchPosts:", err);
    res.status(500).json({
      message: "Error al buscar publicaciones",
      error: err.message,
    });
  }
};

/**
 * GET /search/users?q=...
 * Busca personas por username, nombre o apellido
 */
export const searchUsers = async (req, res) => {
  try {
    const { q = "", limit = 20, page = 1 } = req.query;
    const term = q.toString().trim();
    const limitNum = Number(limit) > 0 ? Number(limit) : 20;
    const pageNum = Number(page) > 0 ? Number(page) : 1;

    if (!term) {
      return res.json([]);
    }

    const regex = { $regex: term, $options: "i" };

    const users = await User.find({
      $or: [
        { username: regex },
        { firstName: regex },
        { lastName: regex },
      ],
    })
      .select("_id username firstName lastName profilePicture degrees")
      .populate("degrees", "name slug")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(users);
  } catch (err) {
    console.error("Error en searchUsers:", err);
    res
      .status(500)
      .json({ message: "Error al buscar usuarios", error: err.message });
  }
};

/**
 * GET /search/media?q=...
 * Devuelve SOLO los archivos (imagenes / docs) asociados a posts que matchean
 */
export const searchMedia = async (req, res) => {
  try {
    const { q = "", limit = 30, page = 1 } = req.query;
    const term = q.toString().trim();
    const limitNum = Number(limit) > 0 ? Number(limit) : 30;
    const pageNum = Number(page) > 0 ? Number(page) : 1;

    const conditions = [
      {
        $or: [
          { images: { $exists: true, $ne: [] } },
          { documents: { $exists: true, $ne: [] } },
        ],
      },
    ];

    if (term) {
      conditions.push({
        $or: [
          { title: { $regex: term, $options: "i" } },
          { content: { $regex: term, $options: "i" } },
        ],
      });
    }

    if (!req.user?.role || req.user.role !== "admin") {
      conditions.push({ flagged: { $ne: true } });
    }

    const matchStage = conditions.length ? { $and: conditions } : {};

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          images: { $ifNull: ["$images", []] },
          documents: { $ifNull: ["$documents", []] },
        },
      },
      {
        $project: {
          media: {
            $concatArrays: [
              {
                $map: {
                  input: "$images",
                  as: "url",
                  in: {
                    postId: "$_id",
                    title: "$title",
                    createdAt: "$createdAt",
                    type: "image",
                    url: "$$url",
                  },
                },
              },
              {
                $map: {
                  input: "$documents",
                  as: "url",
                  in: {
                    postId: "$_id",
                    title: "$title",
                    createdAt: "$createdAt",
                    type: {
                      $cond: {
                        if: {
                          $regexMatch: { input: "$$url", regex: /\.pdf$/i },
                        },
                        then: "pdf",
                        else: "doc",
                      },
                    },
                    url: "$$url",
                  },
                },
              },
            ],
          },
        },
      },
      { $unwind: "$media" },
      { $replaceRoot: { newRoot: "$media" } },
      { $sort: { createdAt: -1, postId: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ];

    const items = await Post.aggregate(pipeline);
    return res.json(items);
  } catch (err) {
    console.error("Error en searchMedia:", err);
    return res
      .status(500)
      .json({ message: "Error al buscar archivos multimedia" });
  }
};
