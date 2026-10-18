import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { formatPriceRange } from '../../utils/pricingUtils.js'
import { buildWatchUrl } from '../../utils/tiktok.js'
import MediaPlaceholder from '../common/MediaPlaceholder'
import TikTokPlayer from './TikTokPlayer'

function ProductQuickViewContent({
  item,
  isSalon,
  isOpen,
  onClose,
  onBook,
  onAddToCart,
  onInquire,
  closeBtnRef,
  sheetRef,
}) {
  const images = useMemo(() => {
    if (!item) return []
    const listedImages = Array.isArray(item.images) ? item.images.filter(Boolean) : []
    const fallback = item.assetUrl || item.image?.assetUrl || item.image?.previewUrl || ''
    return listedImages.length ? listedImages : fallback ? [fallback] : []
  }, [item])

  const videos = useMemo(() => {
    return Array.isArray(item?.videos) ? item.videos : []
  }, [item])

  const slides = useMemo(() => {
    const imageSlides = images.map((image, index) => ({
      type: 'image',
      src: image,
      id: `img-${image}-${index}`,
    }))
    const videoSlides = videos.map((video, index) => ({
      type: 'video',
      video,
      id: `vid-${video.id || index}`,
    }))
    return [...imageSlides, ...videoSlides]
  }, [images, videos])

  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)

  const activeSlide = slides[activeIndex]
  const isVideoSlide = activeSlide?.type === 'video'

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

  const showPrice = formatPriceRange(item?.price, item?.priceMax, pricingType)

  const goPrev = () => {
    if (slides.length <= 1) return
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  const goNext = () => {
    if (slides.length <= 1) return
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  const handleTouchStart = (event) => {
    if (slides[activeIndex]?.type === 'video') return
    setTouchStartX(event.changedTouches?.[0]?.clientX || 0)
  }

  const handleTouchEnd = (event) => {
    if (slides[activeIndex]?.type === 'video') return
    const endX = event.changedTouches?.[0]?.clientX || 0
    const delta = touchStartX - endX
    if (Math.abs(delta) < 40 || slides.length < 2) return
    if (delta > 0) {
      goNext()
      return
    }
    goPrev()
  }

  return (
    <div
      ref={sheetRef}
      className="sheet quick-view-sheet"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sheet-header">
        <h2 id="quickViewTitle">
          {item.name}
          {item.variant ? (
            <span
              className="badge-variant"
              style={{
                marginLeft: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                verticalAlign: 'middle',
              }}
            >
              {item.variant}
            </span>
          ) : null}
        </h2>
        <button
          ref={closeBtnRef}
          className="close-btn"
          onClick={onClose}
          type="button"
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>
      <div className="quick-view-content">
        <div
          className={`quick-view-carousel ${item.bg || ''} ${
            isVideoSlide ? 'carousel-video-mode' : 'carousel-image-mode'
          }`}
        >
          {slides.length ? (
            <>
              <div
                className="quick-view-track"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {slides.map((slide, index) => (
                  <div
                    className={`quick-view-slide${
                      slide.type === 'video' ? ' quick-view-video-slide' : ''
                    }`}
                    key={slide.id}
                  >
                    {slide.type === 'image' ? (
                      <img src={slide.src} alt={`${item.name} ${index + 1}`} />
                    ) : (
                      <TikTokPlayer
                        video={slide.video}
                        item={item}
                        isActiveSlide={activeIndex === index}
                        isOpen={isOpen}
                        coverImage={images[0] || null}
                      />
                    )}
                  </div>
                ))}
              </div>
              {slides.length > 1 ? (
                <>
                  <button
                    className="quick-view-nav prev"
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="quick-view-nav next"
                    type="button"
                    onClick={goNext}
                    aria-label="Next slide"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="quick-view-dots">
                    {slides.map((slide, index) => {
                      const isPhoto = slide.video?.kind === 'photo'
                      return (
                        <button
                          key={`dot-${slide.id}`}
                          className={`quick-view-dot${
                            slide.type === 'video' ? ' video-dot' : ''
                          }${index === activeIndex ? ' active' : ''}`}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={
                            slide.type === 'video'
                              ? isPhoto
                                ? `Go to TikTok photo post ${index + 1}`
                                : `Go to TikTok video ${index + 1}`
                              : `Go to slide ${index + 1}`
                          }
                        >
                          {slide.type === 'video' ? (
                            isPhoto ? (
                              <Images
                                size={11}
                                className="dot-photo-icon"
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="dot-play-icon" aria-hidden="true">
                                ▶
                              </span>
                            )
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <MediaPlaceholder item={item} isSalon={isSalon} />
          )}
        </div>

        {/* Video footer row outside the carousel to prevent clipping */}
        {isVideoSlide && activeSlide?.video ? (
          <div className="quick-view-video-footer">
            <a
              href={buildWatchUrl(activeSlide.video)}
              target="_blank"
              rel="noopener noreferrer"
              className="tiktok-watch-link"
            >
              {activeSlide.video.kind === 'photo'
                ? 'View Photos on TikTok ↗'
                : 'Watch on TikTok ↗'}
            </a>
          </div>
        ) : null}

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
  const sheetRef = useRef(null)

  if (item && item !== prevItem) {
    setPrevItem(item)
    setCachedItem(item)
  }

  const activeItem = item || cachedItem

  // Focus management: save opener and focus close button on open; restore on close
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement
      closeBtnRef.current?.focus?.()
    } else if (openerRef.current) {
      openerRef.current?.focus?.()
      openerRef.current = null
    }
  }, [isOpen])

  // Focus trap inside the modal sheet
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e) => {
      if (e.key !== 'Tab' || !sheetRef.current) return

      const focusableEls = sheetRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )

      if (focusableEls.length === 0) return

      const firstEl = focusableEls[0]
      const lastEl = focusableEls[focusableEls.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTabKey)
    return () => window.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Inactivity of background: set inert on #root while open
  useEffect(() => {
    if (!isOpen) return
    const root = document.getElementById('root')
    if (!root) return
    const prevInert = root.inert
    root.inert = true
    return () => {
      root.inert = prevInert
    }
  }, [isOpen])

  // Scroll lock with layout-shift prevention and guaranteed cleanup
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen])

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
          isOpen={isOpen}
          onClose={onClose}
          onBook={onBook}
          onAddToCart={onAddToCart}
          onInquire={onInquire}
          closeBtnRef={closeBtnRef}
          sheetRef={sheetRef}
        />
      ) : null}
    </div>,
    document.body,
  )
}

export default ProductQuickView
