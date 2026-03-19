function Footer({ onSwitchToAdmin }) {
  return (
    <footer>
      <span className="logo">
        Knot Just<span style={{ color: 'var(--salon-accent)' }}>.</span>
      </span>
      <p>Your home salon & beadwork destination — all in one place.</p>
      <div className="admin-login-wrapper">
        <button
          onClick={onSwitchToAdmin}
          className="admin-login-button"
          aria-label="Staff Portal"
        >
          Staff Portal
        </button>
      </div>
    </footer>
  )
}

export default Footer
