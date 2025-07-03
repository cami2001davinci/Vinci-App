import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import Sidebar from '../components/SideBar';
import PostForm from '../components/PostForm';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user } = useAuth(); // accedo al usuario logueado
  const [posts, setPosts] = useState([]);

  const loadPosts = async () => {
    try {
      const res = await axios.get('/posts');
      setPosts(res.data);
    } catch (err) {
      console.error('Error al cargar posts:', err);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleNewPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostChanged = () => {
    loadPosts();
  };

  return (
    <ThreeColumnLayout
      left={<Sidebar />}
      center={
        <div className="d-flex flex-column gap-3">
          {user?.role === 'admin' ? (
            <PostForm onNewPost={handleNewPost} />
          ) : (
            <p className="text-muted text-center">Solo los administradores pueden publicar en la Home.</p>
          )}
          {posts.map(post => (
  <PostCard key={post._id} post={post} onPostChanged={handlePostChanged} readOnly={true} />
))}

        </div>
      }
      right={null}
    />
  );
};

export default HomePage;

