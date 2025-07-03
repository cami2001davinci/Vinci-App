import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import Sidebar from '../components/SideBar';
import { useAuth } from '../context/AuthContext';

const DegreePage = () => {
  const { user } = useAuth();
  const { slug } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDegreeSlug, setUserDegreeSlug] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/posts/degree/${slug}`);
      if (Array.isArray(res.data)) {
        setPosts(res.data);
      } else {
        setError('Error inesperado: la respuesta no es una lista.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cargar los posts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [slug]);

  useEffect(() => {
    const fetchUserDegree = async () => {
      try {
        const res = await axios.get('/users/me');
        if (res.data?.degree?.slug) {
          setUserDegreeSlug(res.data.degree.slug);
        }
      } catch (err) {
        console.error('Error al obtener la carrera del usuario:', err);
      }
    };

    fetchUserDegree();
  }, []);

  const handleNewPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const postsFiltrados = filtroCategoria
    ? posts.filter(post => post.category === filtroCategoria)
    : posts;

  return (
    <ThreeColumnLayout
      left={<Sidebar />}
      center={
        <div className="d-flex flex-column gap-3 p-3">
          <h1 className="fs-3 fw-bold mb-3 text-capitalize">Sección: {slug.replace(/-/g, ' ')}</h1>

          {userDegreeSlug === slug ? (
            <PostForm onNewPost={handleNewPost} />
          ) : (
            <p className="text-muted mb-3">
              Solo puedes publicar en la sección de tu carrera.
            </p>
          )}

          <div className="mb-3">
            <label className="form-label fw-bold me-2">Filtrar por categoría:</label>
            <select
              className="form-select w-auto d-inline-block"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="comunidad_general">General</option>
              <option value="buscar_colaboradores">Buscar Colaboradores</option>
              <option value="dudas_tecnicas">Dudas Técnicas</option>
              <option value="feedback_proyectos">Feedback Proyectos</option>
              <option value="inspiracion_referencias">Inspiración</option>
            </select>
          </div>

          {loading && <p>Cargando posts...</p>}
          {error && <p className="text-danger">{error}</p>}
          {!loading && !error && postsFiltrados.length === 0 && <p>No hay publicaciones en esta sección.</p>}

          {postsFiltrados.map(post => (
            <PostCard key={post._id} post={post} onPostChanged={fetchPosts} />
          ))}
        </div>
      }
      right={null} // O podrías agregar algo en el futuro
    />
  );
};

export default DegreePage;
