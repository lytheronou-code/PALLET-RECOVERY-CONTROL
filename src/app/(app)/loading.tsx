export default function AppRouteLoading() {
  return (
    <div className="shell route-loading">
      <div className="skeleton-line" style={{ width: 220, height: 22 }} />
      <div className="skeleton-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
      <div className="skeleton-table">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="skeleton-line" key={i} />
        ))}
      </div>
    </div>
  );
}
