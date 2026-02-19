// src/components/MainLayout.jsx
import SideBar from './SideBar';

export default function MainLayout({ children, showSearch = true }) {
  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--bg-app)' }}>
      
      {/* 1. SIDEBAR FIJA (Izquierda) */}
      <aside 
        style={{ 
          width: '280px', 
          minWidth: '280px', 
          borderRight: '2px solid black',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          zIndex: 10
        }}
      >
        <SideBar />
      </aside>

      {/* 2. AREA PRINCIPAL (Centro expandido) */}
      <main className="flex-grow-1 p-4" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
        {/* HEADER FLOTANTE (Buscador + Notificaciones) */}
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

      </main>
    </div>
  );
}