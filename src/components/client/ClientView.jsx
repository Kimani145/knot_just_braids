import { useMemo, useRef } from 'react'
import HeroStrip from './HeroStrip'
import CatalogGrid from './CatalogGrid'

function ClientView({ activeFeed, salonStyles, beadProducts, onBook, onAddToCart }) {
  const catalogRef = useRef(null)
  const isSalon = activeFeed === 'salon'
  const items = isSalon ? salonStyles : beadProducts

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
        <a className="s-icon s-ig" href="#" title="Instagram">
          📸
        </a>
        <a className="s-icon s-snap" href="#" title="Snapchat">
          👻
        </a>
        <a className="s-icon s-tt" href="#" title="TikTok">
          🎵
        </a>
        <a className="s-icon s-wa" href="#" title="WhatsApp">
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
          onBook={onBook}
          onAddToCart={onAddToCart}
        />
      </div>
    </>
  )
}

export default ClientView
