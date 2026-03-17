import { useMemo } from 'react'
import formatCurrency from '../../utils/formatCurrency'

function CartSheet({ isOpen, cart, setCart, onClose, onCheckout }) {
  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * item.qty
    }, 0)
  }, [cart])

  const handleChangeQty = (id, delta) => {
    setCart((prev) => {
      return prev.reduce((next, item) => {
        if (item.id !== id) {
          next.push(item)
          return next
        }

        const max = item.stock ?? Infinity
        const nextQty = Math.max(0, Math.min(item.qty + delta, max))
        if (nextQty > 0) {
          next.push({ ...item, qty: nextQty })
        }
        return next
      }, [])
    })
  }

  const handleClear = () => {
    setCart([])
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} id="cartOverlay">
      <div className="sheet">
        <div className="sheet-header">
          <h2>Your Cart</h2>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div id="cartContent">
          {cart.length === 0 ? (
            <div className="empty-state">
              <div className="big">🛒</div>
              <p>
                Your cart is empty.
                <br />
                Browse the Beadwork Shop to add items.
              </p>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className={`cart-thumb ${item.bg}`}>{item.emoji}</div>
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.price)} each</span>
                    <div className="qty-row">
                      <button
                        className="qty-btn"
                        type="button"
                        onClick={() => handleChangeQty(item.id, -1)}
                      >
                        −
                      </button>
                      <span>{item.qty}</span>
                      <button
                        className="qty-btn"
                        type="button"
                        onClick={() => handleChangeQty(item.id, 1)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                  <strong>
                    {formatCurrency(Number(item.price || 0) * item.qty)}
                  </strong>
                </div>
              ))}
              <div className="cart-total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.7rem' }}>
                <button className="btn btn-outline btn-full" onClick={handleClear}>
                  Clear
                </button>
                <button
                  className="btn btn-full"
                  style={{ background: 'var(--bead-accent)', color: 'white' }}
                  onClick={onCheckout}
                >
                  Checkout →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CartSheet
