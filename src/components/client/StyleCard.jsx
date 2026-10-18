import { Ban, Clock3, Package, Video } from 'lucide-react'
import { formatPriceRange } from '../../utils/pricingUtils.js'

function StyleCard({
  item,
  isSalon,
  onBook,
  onAddToCart,
  onInquire,
  onOpenQuickView,
}) {
  const pricingType = item.pricingType === 'range' ? 'range' : 'fixed'
  const imageUrl = item.images?.[0] || item.assetUrl || item.image?.assetUrl || item.image?.previewUrl
  const isRangeProduct = !isSalon && pricingType === 'range'
  const isOutOfStock =
    !isSalon && !isRangeProduct && item.stock !== undefined && item.stock <= 0
  const isLowStock =
    !isSalon && !isRangeProduct && item.stock !== undefined && item.stock > 0 && item.stock < 3
  const hasVideos = Array.isArray(item.videos) && item.videos.length > 0
  const showPrice = formatPriceRange(item.price, item.priceMax, pricingType)

  const handleAction = () => {
    if (isSalon) {
      onBook?.(item)
      return
    }

    if (isRangeProduct) {
      onInquire?.(item)
      return
    }

    onAddToCart?.(item)
  }

  return (
    <div className="card">
      <div
        className={`card-thumb ${item.bg}`}
        onClick={() => onOpenQuickView?.(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenQuickView?.(item)
          }
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          item.emoji
        )}
        {isOutOfStock ? (
          <span className="badge-new badge-danger">Out of Stock</span>
        ) : null}
        {isLowStock ? (
          <span className="badge-new">Low Stock</span>
        ) : null}
        {hasVideos ? (
          <span className="badge-video" title="Video included" aria-label="Video included">
            <Video size={13} />
          </span>
        ) : null}
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h3>{item.name}</h3>
          {item.variant ? (
            <span className="badge-variant" title={`Variant: ${item.variant}`}>
              {item.variant}
            </span>
          ) : null}
        </div>
        <p className="desc">{item.desc}</p>
        <div className="card-meta">
          <span className="price">{showPrice}</span>
          <span className="sub-info">
            {isSalon
              ? <><Clock3 size={14} /> {item.duration}</>
              : isOutOfStock
                ? <><Ban size={14} /> Out of stock</>
                : <><Package size={14} /> {item.stock} left</>}
          </span>
        </div>
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

export default StyleCard
