// import Post from '../models/postsModel.js';
// import Counter from '../models/counterModel.js';
// import User from '../models/usersModel.js';

// async function getNextSequence(name) {
//   const counter = await Counter.findOneAndUpdate(
//     { name },
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true }
//   );
//   return counter.seq;
// }

// // export const createPost = async (req, res) => {
// //   try {
// //     const { title, content } = req.body;
// //     if (!title || !content) {
// //       return res.status(400).json({ message: 'Título y contenido son requeridos' });
// //     }

// //     const nextNumber = await getNextSequence('postNumber');

// //     const user = await User.findById(req.user._id);
// //     if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

// //     const newPost = new Post({
// //       ...req.body,
// //       postNumber: nextNumber,
// //       author: req.user._id,
// //       degree: user.degree,
// //     });

// //     await newPost.save();
// //     user.posts.push(newPost._id);
// //     await user.save();

// //     res.status(201).json(newPost);
// //   } catch (error) {
// //     res.status(400).json({ message: error.message });
// //   }
// // };

// export const createPost = async (req, res) => {
//   try {
//     const { title, content } = req.body;

//     if (!title || !content) {
//       return res.status(400).json({ message: 'Título y contenido son requeridos' });
//     }

//     const nextNumber = await getNextSequence('postNumber');

//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

//     // Buscar la carrera correspondiente al nombre que tiene el usuario
//     const career = await Career.findOne({ name: user.degree });
//     if (!career) {
//       return res.status(400).json({ message: 'Carrera del usuario no encontrada' });
//     }

//     const newPost = new Post({
//       ...req.body,
//       postNumber: nextNumber,
//       author: req.user._id,
//       degree: career._id,
//     });

//     await newPost.save();

//     user.posts.push(newPost._id);
//     await user.save();

//     res.status(201).json(newPost);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const getAllPosts = async (req, res) => {
//   try {
//     const posts = await Post.find()
//       .populate('author', 'username')
//       .sort({ createdAt: -1 });
//     res.json(posts);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getPostsByUser = async (req, res) => {
//   try {
//     const posts = await Post.find({ author: req.user._id })
//       .populate('author', 'username')
//       .populate({
//         path: 'comments',
//         populate: { path: 'author', select: 'username' }
//       })
//       .sort({ createdAt: -1 });

//     res.json(posts);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// export const getPostByNumber = async (req, res) => {
//   try {
//     const postNumber = Number(req.params.postNumber);

//     const post = await Post.findOne({ postNumber })
//       .populate('author', 'username')
//       .populate({
//         path: 'comments',
//         populate: { path: 'author', select: 'username' },
//         options: { sort: { createdAt: 1 } }
//       });

//     if (!post) return res.status(404).json({ message: 'Post no encontrado' });

//     res.json(post);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const updatePost = async (req, res) => {
//   const postNumber = Number(req.params.postNumber);
//   const userId = req.user._id;

//   try {
//     const post = await Post.findOne({ postNumber });
//     if (!post) return res.status(404).json({ message: 'Post no encontrado' });

//     if (post.author.toString() !== userId.toString())
//       return res.status(403).json({ message: 'No tienes permiso para editar este post' });

//     const updatedPost = await Post.findOneAndUpdate({ postNumber }, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     res.json(updatedPost);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const deletePostByNumber = async (req, res) => {
//   const postNumber = Number(req.params.postNumber);
//   const userId = req.user._id;

//   try {
//     const post = await Post.findOne({ postNumber });
//     if (!post) return res.status(404).json({ message: 'Post no encontrado' });

//     if (post.author.toString() !== userId.toString())
//       return res.status(403).json({ message: 'No tienes permiso para eliminar este post' });

//     await Post.findOneAndDelete({ postNumber });

//     res.json({ message: 'Post eliminado correctamente' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


import Post from '../models/postsModel.js';
import Counter from '../models/counterModel.js';
import User from '../models/usersModel.js';
import Degree from '../models/degreesModel.js'; 

// Función para autoincrementar postNumber
async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Crear un nuevo post
export const createPost = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Título y contenido son requeridos' });
    }

    const nextNumber = await getNextSequence('postNumber');

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Buscar la carrera correspondiente al nombre que tiene el usuario
    const degree = await Degree.findOne({ name: user.degree });
    if (!degree) {
      return res.status(400).json({ message: 'Carrera del usuario no encontrada' });
    }

    const newPost = new Post({
      ...req.body,
      postNumber: nextNumber,
      author: req.user._id,
      degree: degree._id,
    });

    await newPost.save();

    user.posts.push(newPost._id);
    await user.save();

    res.status(201).json(newPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener todos los posts (Home)
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .populate('degree', 'name') 
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todos los posts del usuario autenticado
export const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'username')
      .populate('degree', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' }
      })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener post por número
export const getPostByNumber = async (req, res) => {
  try {
    const postNumber = Number(req.params.postNumber);

    const post = await Post.findOne({ postNumber })
      .populate('author', 'username')
      .populate('degree', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' },
        options: { sort: { createdAt: 1 } }
      });

    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar post
export const updatePost = async (req, res) => {
  const postNumber = Number(req.params.postNumber);
  const userId = req.user._id;

  try {
    const post = await Post.findOne({ postNumber });
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== userId.toString())
      return res.status(403).json({ message: 'No tienes permiso para editar este post' });

    const updatedPost = await Post.findOneAndUpdate({ postNumber }, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar post
export const deletePostByNumber = async (req, res) => {
  const postNumber = Number(req.params.postNumber);
  const userId = req.user._id;

  try {
    const post = await Post.findOne({ postNumber });
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== userId.toString())
      return res.status(403).json({ message: 'No tienes permiso para eliminar este post' });

    await Post.findOneAndDelete({ postNumber });

    res.json({ message: 'Post eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todos los posts por carrera (segmentación por slug)
export const getPostsByDegree= async (req, res) => {
  try {
    const { slug } = req.params;

    const degree = await Degree.findOne({ slug });
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    const posts = await Post.find({ degree: degree._id })
      .populate('author', 'username')
      .populate('degree', 'name')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


