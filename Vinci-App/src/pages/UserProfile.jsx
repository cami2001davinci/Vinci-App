import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axiosInstance';
import Sidebar from '../components/Sidebar';
import UserProfileHeader from '../components/UserProfileHeader';
import UserProfileTabs from '../components/UserProfileTabs';
import { useAuth } from '../context/AuthContext';

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSelf =
    !id ||
    id === 'me' ||
    (user &&
      (user.id === id ||
        user._id === id));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const url = isSelf
          ? '/users/me/full-profile'
          : `/users/profile/${id}`;
        const res = await axios.get(url);
        const data = res.data || {};
        if (!isSelf) {
          data.posts = data.posts || [];
          data.comments = data.comments || [];
        }
        setUserData(data);
      } catch (err) {
        console.error('Error al cargar el perfil:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, isSelf]);

  const handleStartChat = async () => {
    if (!id) return;
    try {
      const { data } = await axios.post(`/chats/with/${id}`);
      const conversationId =
        data?.conversation?._id || data?.conversation?.id;
      if (conversationId) {
        navigate(`/chats?conversationId=${conversationId}`);
      } else {
        navigate('/chats');
      }
    } catch (err) {
      console.error('Error al iniciar chat:', err);
      navigate('/chats');
    }
  };

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  if (!userData)
    return (
      <p className="text-center text-danger mt-4">
        No se encontro el perfil
      </p>
    );

  return (
    <div className="d-flex">
      <Sidebar />

      <main className="flex-fill p-4 container">
        <UserProfileHeader
          user={userData}
          isSelf={isSelf}
          onStartChat={!isSelf ? handleStartChat : undefined}
        />
        <UserProfileTabs
          posts={userData.posts || []}
          comments={userData.comments || []}
        />
      </main>
    </div>
  );
};

export default UserProfilePage;
