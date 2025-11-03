// import Degree from '../models/degreesModel.js';
// import Post from '../models/postsModel.js';
// import User from '../models/usersModel.js';


// export const getAllDegrees = async (req, res) => {
//   try {
//     const degrees = await Degree.find().sort({ name: 1 });
//     res.json(degrees);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const createDegree = async (req, res) => {
//   try {
//     const { name, description } = req.body;

//     if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

//     const slug = name.toLowerCase().replace(/\s+/g, '-');

//     const exists = await Degree.findOne({ slug });
//     if (exists) return res.status(400).json({ message: 'Esa carrera ya existe' });

//     const newDegree = new Degree({ name, slug, description });
//     await newDegree.save();

//     res.status(201).json(newDegree);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// controllers/degreesController.js
import Degree from '../models/degreesModel.js';
import Post from '../models/postsModel.js';
import User from '../models/usersModel.js';

// LISTAR TODAS LAS CARRERAS (lo que ya tenías)
export const getAllDegrees = async (req, res) => {
  try {
    const degrees = await Degree.find().sort({ name: 1 });
    res.json(degrees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREAR UNA CARRERA (lo que ya tenías)
export const createDegree = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const exists = await Degree.findOne({ slug });
    if (exists) return res.status(400).json({ message: 'Esa carrera ya existe' });

    const newDegree = new Degree({ name, slug, description });
    await newDegree.save();

    res.status(201).json(newDegree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ NUEVO: OVERVIEW “estilo Fandom” por carrera (slug)
export const getDegreeOverview = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1) Buscamos la carrera por slug
    const degree = await Degree.findOne({ slug }).lean();
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    // 2) Publicaciones recientes de ESA carrera (últimos 10)
    const recentPosts = await Post.find({ degree: degree._id, flagged: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'username firstName lastName profilePicture')
      .select('content author degree category createdAt images documents likedBy');

    // 3) Top colaboradores (versión simple): quién más posteó en 60 días
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const topByPosts = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true }, createdAt: { $gte: since } } },
      { $group: { _id: '$author', posts: { $sum: 1 } } },
      { $sort: { posts: -1 } },
      { $limit: 5 }
    ]);

    const topContributors = await Promise.all(
      topByPosts.map(async (row) => {
        const u = await User.findById(row._id)
          .select('username firstName lastName profilePicture')
          .lean();
        return { user: u, posts: row.posts, score: row.posts };
      })
    );

    // 4) Categorías activas (últimos 30 días)
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const activeCategories = await Post.aggregate([
      { $match: { degree: degree._id, flagged: { $ne: true }, createdAt: { $gte: since30 } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 5) Devolvemos TODO junto (FAQ/Recursos pueden venir vacíos si aún no están en el schema)
    res.json({
      degree: {
        name: degree.name,
        slug: degree.slug,
        description: degree.description || '',
        bannerImage: degree.bannerImage || '',
        faq: degree.faq || [],
        resources: degree.resources || []
      },
      recentPosts,
      topContributors,
      activeCategories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en overview' });
  }
};

export const getDegreeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const degree = await Degree.findOne({ slug })
      .select('name slug description banner icon'); // agrega los campos que tengas

    if (!degree) {
      return res.status(404).json({ message: 'Carrera no encontrada' });
    }
    res.json(degree);
  } catch (e) {
    res.status(500).json({ message: 'Error buscando la carrera' });
  }
};
