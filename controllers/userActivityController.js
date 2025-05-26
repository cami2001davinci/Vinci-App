import Post from '../models/postsModel.js';
import Comment from '../models/commentsModel.js';
import Degree from '../models/degreesModel.js';

export const getUserActivityByDegree = async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar la carrera
    const degree = await Degree.findOne({ slug });
    if (!degree) return res.status(404).json({ message: 'Carrera no encontrada' });

    // Buscar posts del usuario en esa carrera
    const userPosts = await Post.find({
      author: req.user._id,
      degree: degree._id
    })
    .populate('author', 'username')
    .sort({ createdAt: -1 });

    // Buscar comentarios del usuario en posts de esa carrera
    const degreePosts = await Post.find({ degree: degree._id }).select('_id');
    const postIds = degreePosts.map(post => post._id);

    const userComments = await Comment.find({
      author: req.user._id,
      post: { $in: postIds }
    })
    .populate('post', 'title')
    .sort({ createdAt: -1 });

    res.json({
      posts: userPosts,
      comments: userComments
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
