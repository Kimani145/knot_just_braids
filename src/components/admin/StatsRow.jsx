function StatsRow({ stylesCount, productsCount, pendingCount }) {
  return (
    <div className="stats-row">
      <div className="stat-box">
        <div className="s-num">{stylesCount}</div>
        <div className="s-lbl">Active Styles</div>
      </div>
      <div className="stat-box">
        <div className="s-num">{productsCount}</div>
        <div className="s-lbl">Bead Products</div>
      </div>
      <div className="stat-box">
        <div className="s-num">{pendingCount}</div>
        <div className="s-lbl">Pending Actions</div>
      </div>
    </div>
  )
}

export default StatsRow
