import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      {/* Buscador */}
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

      {/* AQUÍ SOLÍA ESTAR EL WIDGET - AHORA ESTÁ LIMPIO */}
    </>
  );
};

export default RightColumn;