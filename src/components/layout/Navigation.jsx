import { Moon, ShoppingCart, Sun } from 'lucide-react'

function Navigation({
  theme,
  onToggleTheme,
  cartCount,
  onOpenCart,
  onLogoClick,
}) {
  const count = Number(cartCount) || 0
  const showCount = count > 0
  const cartLabel = `Cart, ${count} ${count === 1 ? 'item' : 'items'}`

  return (
    <nav>
      <div className="nav-header-row">
        <div className="logo" onClick={onLogoClick} role="button" tabIndex={0} aria-label="Knot Just Home">
          Knot Just<span className="dot">.</span>
        </div>
        <div className="nav-right">
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn cart-btn" onClick={onOpenCart} title="Cart" aria-label={cartLabel}>
            <ShoppingCart size={18} aria-hidden="true" />
            <span className={`cart-count${showCount ? ' show' : ''}`} aria-hidden="true">
              {count}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
