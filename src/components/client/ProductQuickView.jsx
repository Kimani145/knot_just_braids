import { useEffect, useMemo, useState } from 'react'
import formatCurrency from '../../utils/formatCurrency'

function ProductQuickView({
  isOpen,
  item,
  isSalon,
  onClose,
  onBook,
  onAddToCart,
  onInquire,
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

  useEffect(() => {
    setActiveIndex(0)
  }, [item?.id, isOpen])

  if (!item) return null

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`}>
      <div className="sheet quick-view-sheet">
        <div className="sheet-header">
          <h2>{item.name}</h2>
          <button className="close-btn" onClick={onClose} type="button">
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
    </div>
  )
}

export default ProductQuickView
