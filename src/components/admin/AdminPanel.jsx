function AdminPanel({ title, tagLabel, tagClass, className = '', children }) {
  const classes = ['admin-panel', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="admin-panel-header">
        <h3>{title}</h3>
        <span className={`panel-tag ${tagClass}`}>{tagLabel}</span>
      </div>
      {children}
    </div>
  )
}

export default AdminPanel
