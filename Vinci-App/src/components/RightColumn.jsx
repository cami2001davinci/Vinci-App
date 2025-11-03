export default function RightColumn() {
  return (
    <div className="d-flex flex-column gap-3">
      <div className="card p-3">
        <h6 className="mb-2">Chat (próximamente)</h6>
        <p className="small text-muted mb-0">
          Aquí va a vivir el chat en tiempo real de la carrera.
        </p>
      </div>

      <div className="card p-3">
        <h6 className="mb-2">Buscador (próximamente)</h6>
        <p className="small text-muted mb-0">
          El buscador se integrará aquí con filtros.
        </p>
      </div>
    </div>
  );
}
