import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import Sidebar from '../components/Sidebar';
import UserProfileHeader from '../components/UserProfileHeader';
import UserProfileTabs from '../components/UserProfileTabs';

const UserProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/users/me/full-profile');
        setUserData(res.data);
      } catch (err) {
        console.error('Error al cargar el perfil:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="text-center mt-5"><div className="spinner-border" role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (!userData) return <p className="text-center text-danger mt-4">No se encontró el perfil</p>;

  return (
    <div className="d-flex">
      <Sidebar />

      <main className="flex-fill p-4 container">
        <UserProfileHeader user={userData} />
        <UserProfileTabs posts={userData.posts} comments={userData.comments} />
      </main>
    </div>
  );
};

export default UserProfilePage;
