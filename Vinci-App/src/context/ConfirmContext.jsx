import React, { createContext, useContext, useState, useCallback } from 'react';
import '../styles/PostCard.css'; 

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    variant: "default", 
    resolve: null,
  });

  const confirm = useCallback(({ 
    title = "¿Estás seguro?", 
    message = "Esta acción no se puede deshacer.", 
    confirmText = "Aceptar", 
    variant = "default" 
  }) => {
    return new Promise((resolve) => {
      setModal({ isOpen: true, title, message, confirmText, variant, resolve });
    });
  }, []);

  const handleClose = (result) => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (modal.resolve) modal.resolve(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {modal.isOpen && (
        <div className="neo-modal-overlay">
          {/* Quitamos p-0 para manejarlo mejor, o lo dejamos si te sirve */}
          <div className="neo-post-card neo-modal-box p-0">
            
            {/* 👇 HEADER LIMPIO SIN INLINE STYLES */}
            <div 
              className={`neo-modal-header ${modal.variant === 'danger' ? 'neo-modal-header--danger' : ''}`}
            >
              {modal.title}
            </div>

            {/* Body */}
            <div className="p-4 fs-5 text-center">
              {modal.message}
            </div>

            {/* Footer */}
            <div className="d-flex gap-2 p-3 bg-light border-top border-2 border-dark justify-content-end" style={{ borderRadius: '0 0 14px 14px' }}>
              <button 
                className="neo-action-btn neo-btn-cancel px-4" 
                onClick={() => handleClose(false)}
              >
                Cancelar
              </button>
              <button 
                className={`neo-action-btn px-4 ${modal.variant === 'danger' ? 'neo-btn-danger' : 'bg-dark text-white'}`} 
                onClick={() => handleClose(true)}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);