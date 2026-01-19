import { useState } from "react";
import axios from "../api/axiosInstance";

const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const getImageUrl = (url) =>
  url?.startsWith("http") ? url : `${baseUrl}${url || ""}`;

const UserProfileHeader = ({ user, isSelf = true, onStartChat }) => {
  const [uploading, setUploading] = useState(false);
  const [previewProfile, setPreviewProfile] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username || "",
    bio: user.bio || "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.put("/users/me/update-profile", formData);
      window.location.reload();
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert("Error al actualizar el perfil");
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "profilePicture") {
      setPreviewProfile(URL.createObjectURL(file));
    } else {
      setPreviewCover(URL.createObjectURL(file));
    }

    const data = new FormData();
    data.append(type, file);
    setUploading(true);

    try {
      await axios.put(
        `/users/me/upload-${type === "profilePicture" ? "profile" : "cover"}`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      window.location.reload();
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="position-relative mb-3">
        {previewCover || user.coverPicture ? (
          <img
            src={previewCover || getImageUrl(user.coverPicture)}
            alt="Portada"
            className="img-fluid rounded w-100"
            style={{ maxHeight: "300px", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div
            className="bg-secondary text-white d-flex align-items-center justify-content-center rounded"
            style={{ height: "200px" }}
          >
            <p className="mb-0">Sin portada</p>
          </div>
        )}
        {isSelf && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e, "coverPicture")}
            className="form-control position-absolute"
            style={{ top: "10px", right: "10px", width: "200px", opacity: 0.8 }}
            title="Cambiar portada"
          />
        )}
      </div>

      <div className="d-flex align-items-center">
        <div className="me-3 position-relative">
          {previewProfile || user.profilePicture ? (
            <img
              src={previewProfile || getImageUrl(user.profilePicture)}
              alt="Perfil"
              className="rounded-circle border"
              style={{ width: "100px", height: "100px", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div
              className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "100px", height: "100px" }}
            >
              <p className="mb-0">Sin foto</p>
            </div>
          )}
          {isSelf && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, "profilePicture")}
              className="form-control position-absolute"
              style={{
                top: "0",
                left: "0",
                width: "100px",
                height: "100px",
                opacity: 0,
                cursor: "pointer",
              }}
              title="Cambiar foto de perfil"
            />
          )}
        </div>

        <div>
          {isSelf && editing ? (
            <div>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Nombre"
                className="form-control mb-2"
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Apellido"
                className="form-control mb-2"
              />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                className="form-control mb-2"
              />
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Biografia"
                className="form-control mb-2"
              ></textarea>

              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm me-2"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <div className="d-flex align-items-center mb-1 gap-2">
                <h2 className="mb-0">
                  {user.firstName} {user.lastName}
                </h2>
                {isSelf ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Editar perfil
                  </button>
                ) : onStartChat ? (
                  <button
                    onClick={onStartChat}
                    className="btn btn-primary btn-sm"
                  >
                    Enviar mensaje
                  </button>
                ) : null}
              </div>
              <p className="text-muted mb-1">@{user.username}</p>
              <p>{user.bio || "Sin biografia"}</p>
            </>
          )}
          {uploading && (
            <div
              className="spinner-border spinner-border-sm text-primary"
              role="status"
            ></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
