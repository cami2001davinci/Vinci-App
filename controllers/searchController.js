// controllers/searchController.js
import Post from "../models/postsModel.js";
import User from "../models/usersModel.js";

/**
 * GET /search/posts?q=...&tab=destacados|recientes
 * - destacados: ordena por score de interaccion
 * - recientes: ordena por fecha desc
 */

function escapeRegex(text){
  return text.replace (/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const searchPosts = async (req, res) => {
  try {
    const { q = "", tab = "destacados", limit = 20, page = 1 } = req.query;
    const term = q.toString().trim();
    const tabKey = tab.toString().toLowerCase();
    const limitNum = Number(limit) > 0 ? Number(limit) : 20;
    const pageNum = Number(page) > 0 ? Number(page) : 1;

    const match = {};

    if (term) {
      const safeRegex = new RegExp(escapeRegex(term), "i");
      match.$or = [
        { title: { $regex: safeRegex } },
        { content: { $regex: safeRegex } },
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

    const docs = await Post.aggregate(pipeline).collation({ locale: 'es', strength: 1 });

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
    // Si no hay búsqueda, devolvemos vacío directamente
    if (!q || q.toString().trim() === "") return res.json([]);

    const term = q.toString().trim();
    const limitNum = Math.max(1, Number(limit) || 20); // Aseguramos positivo
    const pageNum = Math.max(1, Number(page) || 1);    // Aseguramos positivo

    // Limpiamos el término para usarlo en Regex sin peligro
    const safeRegex = new RegExp(escapeRegex(term), "i");

    const users = await User.find({
      $or: [
        { username: { $regex: safeRegex } },
        { firstName: { $regex: safeRegex } },
        { lastName: { $regex: safeRegex } },
      ],
    })
      // Collation permite que "cami" encuentre "Cami" y "Jose" encuentre "José"
      .collation({ locale: 'es', strength: 1 }) 
      .select("_id username firstName lastName profilePicture degrees")
      .populate("degrees", "name slug")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(users);
  } catch (err) {
    console.error("Error en searchUsers:", err);
    res.status(500).json({ message: "Error al buscar usuarios", error: err.message });
  }
};

/**
 * GET /search/media?q=...
 * Devuelve SOLO los archivos (imagenes / docs) asociados a posts que matchean
 */
// Asegúrate de que esta función 'searchMedia' esté en el mismo archivo
// donde ya definiste 'escapeRegex' arriba de todo.

export const searchMedia = async (req, res) => {
  try {
    const { q = "", limit = 30, page = 1 } = req.query;
    
    // 1. Limpieza y validación
    const term = q.toString().trim();
    const limitNum = Math.max(1, Number(limit) || 30);
    const pageNum = Math.max(1, Number(page) || 1);

    // Condiciones base: Que tenga imágenes O documentos
    const conditions = [
      {
        $or: [
          { images: { $exists: true, $ne: [] } },
          { documents: { $exists: true, $ne: [] } },
        ],
      },
    ];

    // 2. Búsqueda de texto segura (si hay término)
    if (term) {
      const safeRegex = new RegExp(escapeRegex(term), "i");
      conditions.push({
        $or: [
          { title: { $regex: safeRegex } },
          { content: { $regex: safeRegex } },
        ],
      });
    }

    // 3. Filtro de seguridad (ocultar flaggeados si no es admin)
    if (!req.user?.role || req.user.role !== "admin") {
      conditions.push({ flagged: { $ne: true } });
    }

    const matchStage = conditions.length ? { $and: conditions } : {};

    const pipeline = [
      { $match: matchStage }, // Filtra los posts primero
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          // Aseguramos que sean arrays para evitar errores
          images: { $ifNull: ["$images", []] },
          documents: { $ifNull: ["$documents", []] },
        },
      },
      // Transformamos todo a un formato común "media"
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
                        if: { $regexMatch: { input: "$$url", regex: /\.pdf$/i } },
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
      { $unwind: "$media" }, // Descomprimimos el array
      { $replaceRoot: { newRoot: "$media" } }, // Elevamos el objeto media al nivel raíz
      { $sort: { createdAt: -1, postId: -1 } }, // Ordenamos por fecha
      { $skip: (pageNum - 1) * limitNum }, // Paginamos
      { $limit: limitNum },
    ];

    // 🔥 APLICAMOS COLLATION AQUÍ TAMBIÉN
    const items = await Post.aggregate(pipeline).collation({ locale: 'es', strength: 1 });
    
    return res.json(items);

  } catch (err) {
    console.error("Error en searchMedia:", err);
    return res.status(500).json({ message: "Error al buscar archivos multimedia" });
  }
};
