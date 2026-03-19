function Navigation({
  theme,
  onToggleTheme,
  cartCount,
  onOpenCart,
  onLogoClick,
}) {
  const themeIcon = theme === 'dark' ? '☀️' : '🌙'
  const showCount = cartCount > 0

  return (
    <nav>
      <div className="logo" onClick={onLogoClick}>
        Knot Just<span className="dot">.</span>
      </div>
      <div className="nav-right">
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          {themeIcon}
        </button>
        <button className="icon-btn cart-btn" onClick={onOpenCart} title="Cart">
          🛒
          <span className={`cart-count${showCount ? ' show' : ''}`}>
            {cartCount}
          </span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation
