import { Moon, ShoppingCart, Sun } from 'lucide-react'

function Navigation({
  theme,
  onToggleTheme,
  cartCount,
  onOpenCart,
  onLogoClick,
}) {
  const showCount = cartCount > 0

  return (
    <nav>
      <div className="nav-header-row">
        <div className="logo" onClick={onLogoClick}>
          Knot Just<span className="dot">.</span>
        </div>
        <div className="nav-right">
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn cart-btn" onClick={onOpenCart} title="Cart">
            <ShoppingCart size={18} />
            <span className={`cart-count${showCount ? ' show' : ''}`}>
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
