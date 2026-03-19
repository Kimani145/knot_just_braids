function SkeletonCard({ showButton = true }) {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <div className="card-thumb skeleton-block skeleton-card-thumb" />
      <div className="card-body">
        <div className="skeleton-block skeleton-card-title" />
        <div className="skeleton-block skeleton-card-line" />
        <div className="skeleton-block skeleton-card-line skeleton-card-line-short" />
        <div className="skeleton-card-meta">
          <div className="skeleton-block skeleton-card-pill" />
          <div className="skeleton-block skeleton-card-pill skeleton-card-pill-short" />
        </div>
        {showButton ? (
          <div className="skeleton-block skeleton-card-button" />
        ) : null}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <div className="skeleton-block skeleton-row-avatar" />
      <div className="skeleton-row-copy">
        <div className="skeleton-block skeleton-row-line skeleton-row-line-primary" />
        <div className="skeleton-block skeleton-row-line skeleton-row-line-secondary" />
      </div>
      <div className="skeleton-block skeleton-row-pill" />
    </div>
  )
}

export { SkeletonCard, SkeletonRow }
