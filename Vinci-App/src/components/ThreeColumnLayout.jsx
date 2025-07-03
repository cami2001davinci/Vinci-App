// components/ThreeColumnLayout.jsx
const ThreeColumnLayout = ({ left, center, right }) => {
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <aside className="col-md-3 d-none d-md-block bg-light p-3">
          {left}
        </aside>

        <main className="col-12 col-md-6 p-3">
          {center}
        </main>

        <div className="col-md-3 d-none d-md-block bg-light p-3">
          {right}
        </div>
      </div>
    </div>
  );
};

export default ThreeColumnLayout;
