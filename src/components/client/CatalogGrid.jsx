import { useState } from 'react'
import StyleCard from './StyleCard'
import ProductQuickView from './ProductQuickView'
import { SkeletonCard } from '../layout/Skeletons'
import { isPubliclyVisible } from '../../utils/catalogVisibility'

function CatalogGrid({ items, isSalon, isLoading, onBook, onAddToCart, onInquire }) {
  const [quickViewItem, setQuickViewItem] = useState(null)
  const visibleItems = (items || []).filter(isPubliclyVisible)

  if (isLoading) {
    return (
      <div className="catalog-grid" id="catalogGrid">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonCard key={`catalog-skeleton-${index}`} />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="catalog-grid" id="catalogGrid">
        {visibleItems.map((item) => (
          <StyleCard
            key={`${isSalon ? 'salon' : 'beads'}-${item.id}`}
            item={item}
            isSalon={isSalon}
            onBook={onBook}
            onAddToCart={onAddToCart}
            onInquire={onInquire}
            onOpenQuickView={setQuickViewItem}
          />
        ))}
      </div>
      <ProductQuickView
        isOpen={Boolean(quickViewItem)}
        item={quickViewItem}
        isSalon={isSalon}
        onClose={() => setQuickViewItem(null)}
        onBook={onBook}
        onAddToCart={onAddToCart}
        onInquire={onInquire}
      />
    </>
  )
}

export default CatalogGrid
