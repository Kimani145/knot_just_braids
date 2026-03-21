function Footer({ onSwitchToAdmin }) {
  return (
    <footer>
      <span className="logo">
        Knot Just<span style={{ color: 'var(--salon-accent)' }}>.</span>
      </span>
      <p>
        Always do you but let me do your hair 🌸 Home-based and mobile braider 📍
        Kasarani (Available for housecalls).
      </p>
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
