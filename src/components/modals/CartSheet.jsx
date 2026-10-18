import { useEffect, useMemo } from 'react'
import { ShoppingBag, X } from 'lucide-react'
import formatCurrency from '../../utils/formatCurrency'
import { getOptimizedCloudinaryUrl } from '../../utils/cloudinaryUrl'
import MediaPlaceholder from '../common/MediaPlaceholder'

function CartSheet({ isOpen, cart, setCart, onClose, onCheckout }) {
  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * item.qty
    }, 0)
  }, [cart])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Scroll lock with cleanup
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  return (
    <div
      className={`overlay${isOpen ? ' open' : ''}`}
      id="cartOverlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cartTitle"
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="cartTitle">Your Cart</h2>
          <button
            className="close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>
        <div id="cartContent">
          {cart.length === 0 ? (
            <div className="empty-state">
              <div className="big" aria-hidden="true">
                <ShoppingBag size={48} />
              </div>
              <p>
                Your cart is empty.
                <br />
                Browse the Beadwork Shop to add items.
              </p>
            </div>
          ) : (
            <>
              {cart.map((item) => {
                const itemImg = item.images?.[0] || item.assetUrl || item.image?.assetUrl
                return (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-thumb">
                      {itemImg ? (
                        <img
                          src={getOptimizedCloudinaryUrl(itemImg, { width: 120 })}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <MediaPlaceholder
                          item={item}
                          isSalon={false}
                          className="cart-thumb-placeholder"
                        />
                      )}
                    </div>
                    <div className="cart-item-info">
                      <strong>
                        {item.name}
                        {item.variant ? (
                          <span
                            className="badge-variant"
                            style={{ marginLeft: 6, fontSize: '0.72rem' }}
                          >
                            {item.variant}
                          </span>
                        ) : null}
                      </strong>
                      <span>{formatCurrency(item.price)} each</span>
                      <div className="qty-row">
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => handleChangeQty(item.id, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => handleChangeQty(item.id, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                    <strong>
                      {formatCurrency(Number(item.price || 0) * item.qty)}
                    </strong>
                  </div>
                )
              })}
              <div className="cart-total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.7rem' }}>
                <button
                  className="btn btn-outline btn-full"
                  type="button"
                  onClick={handleClear}
                >
                  Clear
                </button>
                <button
                  className="btn btn-full"
                  type="button"
                  style={{
                    background: 'var(--bead-accent)',
                    color: 'var(--feed-text, white)',
                  }}
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
