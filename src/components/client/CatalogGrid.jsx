import StyleCard from './StyleCard'

function CatalogGrid({ items, isSalon, onBook, onAddToCart }) {
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
