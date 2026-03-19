import { useMemo, useRef } from 'react'
import HeroStrip from './HeroStrip'
import CatalogGrid from './CatalogGrid'

function ClientView({
  activeFeed,
  salonStyles,
  beadProducts,
  loadingSalon,
  loadingBeads,
  onBook,
  onAddToCart,
}) {
  const catalogRef = useRef(null)
  const isSalon = activeFeed === 'salon'
  const items = isSalon ? salonStyles : beadProducts
  const isLoading = isSalon ? loadingSalon : loadingBeads

  const catalogCopy = useMemo(() => {
    return isSalon
      ? { label: '✦ The Catalog', title: 'Available Styles' }
      : { label: '✦ The Collection', title: 'Beadwork Products' }
  }, [isSalon])

  const handlePrimaryAction = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <HeroStrip activeFeed={activeFeed} onPrimaryAction={handlePrimaryAction} />

      <div className="socials-bar">
        <span>Find us →</span>
        <a
          className="s-icon s-ig"
          href="https://instagram.com/knotjust"
          title="Instagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          📸
        </a>
        <a
          className="s-icon s-snap"
          href="https://snapchat.com/add/knotjust"
          title="Snapchat"
          target="_blank"
          rel="noopener noreferrer"
        >
          👻
        </a>
        <a
          className="s-icon s-tt"
          href="https://tiktok.com/@knotjust"
          title="TikTok"
          target="_blank"
          rel="noopener noreferrer"
        >
          🎵
        </a>
        <a
          className="s-icon s-wa"
          href="https://wa.me/254768411265?text=Hi!%20I'm%20reaching%20out%20from%20the%20Knot%20Just%20website."
          title="WhatsApp"
          target="_blank"
          rel="noopener noreferrer"
        >
          💬
        </a>
      </div>

      <div className="catalog-section" id="catalogSection" ref={catalogRef}>
        <div className="section-label" id="catalogLabel">
          {catalogCopy.label}
        </div>
        <div className="section-title" id="catalogTitle">
          {catalogCopy.title}
        </div>
        <CatalogGrid
          items={items}
          isSalon={isSalon}
          isLoading={isLoading}
          onBook={onBook}
          onAddToCart={onAddToCart}
        />
      </div>
    </>
  )
}

export default ClientView
