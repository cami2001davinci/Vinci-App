import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PrivateRoute from './routes/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Construction from './pages/Construction';
import DegreePage from './pages/DegreePage';
import UserProfilePage from './pages/UserProfile';
// import ChatsPage from './pages/ChatsPage'; // Si la vas a agregar
import AppLayout from './components/AppLayout';


function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas con Navbar */}
        <Route
          path="/login"
          element={
            <>
              <Login />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <Register />
            </>
          }
        />

        {/* Rutas protegidas con Sidebar persistente */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout>
                <Home />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <PrivateRoute>
              <AppLayout>
                <UserProfilePage />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/degrees/:slug"
          element={
            <PrivateRoute>
              <AppLayout>
                <DegreePage />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/construction"
          element={
            <PrivateRoute>
              <AppLayout>
                <Construction />
              </AppLayout>
            </PrivateRoute>
          }
        />

        {/* <Route
          path="/chats"
          element={
            <PrivateRoute>
              <AppLayout>
                <ChatsPage />
              </AppLayout>
            </PrivateRoute>
          }
        /> */}
        <Route path="" element={<Navigate to="/" />} />


        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
