// src/components/AppLayout.jsx
import SideBar from "./SideBar";

// Agregamos la prop showSearch por si alguna vista no la necesita
const AppLayout = ({ children, showSearch = true }) => {
  return (
    <div className="d-flex vh-100 vw-100 overflow-hidden" style={{ backgroundColor: 'var(--bg-app, #f8f9fa)' }}>
      
      {/* 1. ÚNICO SIDEBAR */}
      <aside 
        style={{ width: "280px", flexShrink: 0 }} 
        className="border-end border-2 border-dark bg-white"
      >
        <SideBar />
      </aside>

      {/* 2. CONTENIDO PRINCIPAL (HOME) */}
      <main className="flex-grow-1 overflow-auto p-4 d-flex justify-content-center">
        
        {/* Un contenedor central para que no se estire al 100% en monitores gigantes */}
        <div style={{ maxWidth: '1000px', width: '100%' }}>
            
            {/* HEADER FLOTANTE (Buscador + Notificaciones) recuperado de tu MainLayout */}
            {showSearch && (
              <header className="d-flex justify-content-between align-items-center mb-5 gap-3">
                
                {/* Buscador Estilo "Barra Google Retro" */}
                <div className="flex-grow-1 position-relative">
                  <input 
                    type="text" 
                    className="w-100 neo-input"
                    style={{ height: '50px', fontSize: '1.1rem', paddingLeft: '50px' }}
                    placeholder="Buscar en el universo Vinci..." 
                  />
                  <i className="bi bi-search position-absolute" style={{ left: '15px', top: '15px', fontSize: '1.2rem' }}></i>
                </div>

                {/* Campana de Notificaciones (Badge) */}
                <button 
                  className="position-relative d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '50px', height: '50px', 
                    background: 'white', 
                    border: '2px solid black', 
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px #000',
                    cursor: 'pointer'
                  }}
                >
                  <i className="bi bi-bell-fill fs-4" style={{ color: '#FFD600' }}></i>
                  {/* Puntito rojo */}
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-dark">
                    3
                  </span>
                </button>

              </header>
            )}

            {/* CONTENIDO HIJO (Feed, Perfil, etc.) */}
            <div className="content-wrapper">
              {children}
            </div>
            
        </div>

      </main>
      
    </div>
  );
};

export default AppLayout;