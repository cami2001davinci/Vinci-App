// RightColumn.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatWidget from "./ChatWidget";

const RightColumn = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;

    navigate(`/search?q=${encodeURIComponent(q)}&tab=destacados`);
  };

  return (
    <>
      {/* Buscador arriba, fijo en la columna */}
      <div className="card p-3 mb-3">
        <form onSubmit={handleSearchSubmit}>
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar personas, carreras o palabras clave"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* El widget flota abajo a la derecha y es global */}
      <ChatWidget />
    </>
  );
};

export default RightColumn;
