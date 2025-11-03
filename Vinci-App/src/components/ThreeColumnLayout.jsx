// src/components/ThreeColumnLayout.jsx
export default function ThreeColumnLayout({ left, center, right }) {
  return (
    <div className="container-fluid">
      <div className="vinci-3col">
        <aside className="vinci-left">
          {left || null}
        </aside>

        <main className="vinci-center">
          {center || null}
        </main>

        <aside className="vinci-right">
          {right || null}
        </aside>
      </div>
    </div>
  );
}
