import { useEffect, useState, useRef } from 'react';
import axios from '../api/axiosInstance';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import Sidebar from '../components/SideBar';
import PostCard from '../components/PostCard';
import RightColumn from '../components/RightColumn';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const ids = useRef(new Set()); // evitar duplicados

  const loadPosts = async () => {
    try {
      const res = await axios.get('/posts');
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setPosts(items);
      ids.current = new Set(items.map(p => p._id));
    } catch (err) {
      console.error('Error al cargar posts:', err);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // A) Evento local (misma pestaña)
  useEffect(() => {
    const onCreated = (e) => {
      const post = e.detail;
      if (post?._id && !ids.current.has(post._id)) {
        setPosts(prev => [post, ...prev]);
        ids.current.add(post._id);
      }
    };
    window.addEventListener("vinci:post:created", onCreated);
    return () => window.removeEventListener("vinci:post:created", onCreated);
  }, []);

  // B) BroadcastChannel entre pestañas + C) Fallback por storage
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel("vinci-posts");
      bc.onmessage = (e) => {
        const msg = e?.data;
        if (msg?.type === "created") {
          const post = msg?.payload;
          if (post?._id && !ids.current.has(post._id)) {
            setPosts(prev => [post, ...prev]);
            ids.current.add(post._id);
          }
        }
      };
    } catch (_) {}

    const onStorage = (ev) => {
      if (ev.key !== "vinci:newPost" || !ev.newValue) return;
      try {
        const data = JSON.parse(ev.newValue);
        const post = data?.post;
        if (post?._id && !ids.current.has(post._id)) {
          setPosts(prev => [post, ...prev]);
          ids.current.add(post._id);
        }
      } catch (_) {}
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      try { bc && bc.close(); } catch (_) {}
    };
  }, []);

  const handlePostChanged = () => {
    // refresca likes/conteos al cambiar algo desde la Home
    loadPosts();
  };

  return (
    <ThreeColumnLayout
      left={<Sidebar />}
      center={
        <div className="d-flex flex-column gap-3">
          {/* Sin PostForm y sin cartel de admin */}
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onPostChanged={handlePostChanged}
              origin="home"            // por si tu PostCard customiza UI según origen
              canLike={true}           // habilita likes
              canComment={false}       // bloquea crear comentarios en Home
            />
          ))}
        </div>
      }
      right={<RightColumn />}
    />
  );
};

export default HomePage;
