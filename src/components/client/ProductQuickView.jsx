import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import formatCurrency from '../../utils/formatCurrency'

function ProductQuickViewContent({
  item,
  isSalon,
  onClose,
  onBook,
  onAddToCart,
  onInquire,
  closeBtnRef,
}) {
  const images = useMemo(() => {
    if (!item) return []
    const listedImages = Array.isArray(item.images) ? item.images.filter(Boolean) : []
    const fallback = item.assetUrl || item.image?.assetUrl || item.image?.previewUrl || ''
    return listedImages.length ? listedImages : fallback ? [fallback] : []
  }, [item])
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)

  const pricingType = item?.pricingType === 'range' ? 'range' : 'fixed'
  const isRangeProduct = !isSalon && pricingType === 'range'
  const isOutOfStock = !isSalon && !isRangeProduct && Number(item?.stock) <= 0

  const handleAction = () => {
    if (!item) return
    if (isSalon) {
      onBook?.(item)
      onClose?.()
      return
    }
    if (isRangeProduct) {
      onInquire?.(item)
      onClose?.()
      return
    }
    onAddToCart?.(item)
    onClose?.()
  }

  const showPrice =
    pricingType === 'range'
      ? `${formatCurrency(item?.price)} – ${formatCurrency(item?.priceMax)}`
      : formatCurrency(item?.price)

  const goPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleTouchStart = (event) => {
    setTouchStartX(event.changedTouches?.[0]?.clientX || 0)
  }

  const handleTouchEnd = (event) => {
    const endX = event.changedTouches?.[0]?.clientX || 0
    const delta = touchStartX - endX
    if (Math.abs(delta) < 40 || images.length < 2) return
    if (delta > 0) {
      goNext()
      return
    }
    goPrev()
  }

  return (
    <div className="sheet quick-view-sheet">
      <div className="sheet-header">
        <h2 id="quickViewTitle">{item.name}</h2>
        <button
          ref={closeBtnRef}
          className="close-btn"
          onClick={onClose}
          type="button"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>
      <div className="quick-view-content">
        <div className={`quick-view-carousel ${item.bg}`}>
          {images.length ? (
            <>
              <div
                className="quick-view-track"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {images.map((image, index) => (
                  <div className="quick-view-slide" key={`${image}-${index}`}>
                    <img src={image} alt={`${item.name} ${index + 1}`} />
                  </div>
                ))}
              </div>
              {images.length > 1 ? (
                <>
                  <button
                    className="quick-view-nav prev"
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="quick-view-nav next"
                    type="button"
                    onClick={goNext}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="quick-view-dots">
                    {images.map((_, index) => (
                      <button
                        key={`dot-${index}`}
                        className={`quick-view-dot${index === activeIndex ? ' active' : ''}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="quick-view-emoji">{item.emoji}</div>
          )}
        </div>
        <p className="quick-view-price">{showPrice}</p>
        <p className="quick-view-desc">{item.desc}</p>
        <button
          className="card-action"
          type="button"
          onClick={handleAction}
          disabled={isOutOfStock}
        >
          {isSalon
            ? 'Book this style →'
            : isRangeProduct
              ? 'Inquire →'
              : isOutOfStock
                ? 'Out of Stock'
                : 'Add to Cart +'}
        </button>
      </div>
    </div>
  )
}

function ProductQuickView({
  isOpen,
  item,
  isSalon,
  onClose,
  onBook,
  onAddToCart,
  onInquire,
}) {
  const [cachedItem, setCachedItem] = useState(item)
  const [prevItem, setPrevItem] = useState(item)
  const openerRef = useRef(null)
  const closeBtnRef = useRef(null)

  if (item && item !== prevItem) {
    setPrevItem(item)
    setCachedItem(item)
  }

  const activeItem = item || cachedItem

  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement
      closeBtnRef.current?.focus?.()
    } else if (openerRef.current) {
      openerRef.current?.focus?.()
      openerRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

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

  if (!activeItem && !isOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`overlay${isOpen ? ' open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickViewTitle"
    >
      {activeItem ? (
        <ProductQuickViewContent
          key={activeItem.id}
          item={activeItem}
          isSalon={isSalon}
          onClose={onClose}
          onBook={onBook}
          onAddToCart={onAddToCart}
          onInquire={onInquire}
          closeBtnRef={closeBtnRef}
        />
      ) : null}
    </div>,
    document.body,
  )
}

export default ProductQuickView
