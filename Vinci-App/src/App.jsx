import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React, { useEffect } from "react";
import { socket } from "./services/socket";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import PrivateRoute from "./routes/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import Construction from "./pages/Construction";
import DegreePage from "./pages/DegreePage";
import UserProfilePage from "./pages/UserProfile";
// import ChatsPage from './pages/ChatsPage'; // Si la vas a agregar
import AppLayout from "./components/AppLayout";
import PostPage from './pages/PostPage';

function App() {
  useEffect(() => {
    const onConnect = () => console.log("WS conectado:", socket.id);
    const onDisconnect = () => console.log("WS desconectado");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    const onNotif = (n) => {
      console.log("[WS] notification:", n);
      // Sugerencia: disparo global para Sidebar/Badge/Dropdown
      window.dispatchEvent(
        new CustomEvent("vinci:notification", { detail: n })
      );
    };
    const onCount = (p) => {
      console.log("[WS] notifications:count", p);
      window.dispatchEvent(
        new CustomEvent("vinci:notifications-count", { detail: p })
      );
    };

    socket.on("notification", onNotif);
    socket.on("notifications:count", onCount);

    return () => {
      socket.off("notification", onNotif);
      socket.off("notifications:count", onCount);
    };
  }, []);

  // ➕ Redisparamos eventos globales para que cada PostCard se actualice
  useEffect(() => {
    const onPostLike = (p) =>
      window.dispatchEvent(new CustomEvent("vinci:post-like", { detail: p }));
    const onPostComment = (p) =>
      window.dispatchEvent(
        new CustomEvent("vinci:post-comment", { detail: p })
      );

    socket.on("post:like", onPostLike);
    socket.on("post:comment", onPostComment);

    return () => {
      socket.off("post:like", onPostLike);
      socket.off("post:comment", onPostComment);
    };
  }, []);

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
          path="/posts/:id"
          element={
            <PrivateRoute>
              <AppLayout>
                <PostPage />
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
