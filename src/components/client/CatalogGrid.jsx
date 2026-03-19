import StyleCard from './StyleCard'
import { SkeletonCard } from '../layout/Skeletons'

function CatalogGrid({ items, isSalon, isLoading, onBook, onAddToCart }) {
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
    <div className="catalog-grid" id="catalogGrid">
      {items.map((item) => (
        <StyleCard
          key={`${isSalon ? 'salon' : 'beads'}-${item.id}`}
          item={item}
          isSalon={isSalon}
          onBook={onBook}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}

export default CatalogGrid
