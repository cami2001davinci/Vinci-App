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
import ChatsPage from "./pages/ChatsPage";
import AppLayout from "./components/AppLayout";
import PostPage from "./pages/PostPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotificationBridge from "./components/NotificationBridge";
import Welcome from "./pages/Welcome";
import SearchPage from "./pages/SearchPage";
import RequestsPage from "./pages/RequestsPage";
import { ConfirmProvider } from './context/ConfirmContext'; 
function App() {
  // Logs básicos de conexión/desconexión
  useEffect(() => {
    const onConnect = () => {
      console.log("WS conectado:", socket.id);
    };

    const onDisconnect = (reason) => {
      console.log("WS desconectado. Motivo:", reason);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Escucha eventos del socket y los reexpone a la app
  useEffect(() => {
    if (!socket) return;

    const notify = (payload) =>
      window.dispatchEvent(
        new CustomEvent("vinci:notification", { detail: payload })
      );
    const chatMsg = (payload) =>
      window.dispatchEvent(
        new CustomEvent("vinci:chat-message", { detail: payload })
      );
    const collabReq = (payload) =>
      window.dispatchEvent(
        new CustomEvent("vinci:collab-request", { detail: payload })
      );

    socket.on("notification", notify);
    socket.on("notification:new", notify);
    socket.on("post:liked", notify);
    socket.on("comment:liked", notify);
    socket.on("comment:replied", notify);
    socket.on("chat:message", chatMsg);
    socket.on("collab:request", collabReq);

    return () => {
      socket.off("notification", notify);
      socket.off("notification:new", notify);
      socket.off("post:liked", notify);
      socket.off("comment:liked", notify);
      socket.off("comment:replied", notify);
      socket.off("chat:message", chatMsg);
      socket.off("collab:request", collabReq);
    };
  }, []);

  return (
    <Router>
      {/* AQUÍ CONECTAMOS EL PROVIDER GLOBALMENTE */}
      <ConfirmProvider>
        
        {/* Bridge global para reproducir sonido cuando llega "vinci:notification" */}
        <NotificationBridge />

        <Routes>
          {/* Rutas públicas */}
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

          <Route path="/welcome" element={<Welcome />} />

          {/* Rutas protegidas con layout principal */}
          
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
            path="/requests" 
            element={
              <PrivateRoute>
                <AppLayout>
                  <RequestsPage /> 
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
            path="/notifications"
            element={
              <PrivateRoute>
                <AppLayout>
                  <NotificationsPage />
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

          <Route
            path="/chats"
            element={
              <PrivateRoute>
                <AppLayout>
                  <ChatsPage />
                </AppLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/search"
            element={
              <PrivateRoute>
                <AppLayout>
                  <SearchPage />
                </AppLayout>
              </PrivateRoute>
            }
          />

          {/* Redirección vacía a la pantalla de bienvenida */}
          <Route path="" element={<Navigate to="/welcome" />} />

          {/* 404 */}
          <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
        </Routes>
      
      </ConfirmProvider> 
    </Router>
  );
}

export default App;