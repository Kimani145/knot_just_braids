import { Ban, Clock3, Images, Package, Video } from 'lucide-react'
import { formatPriceRange } from '../../utils/pricingUtils.js'
import { getOptimizedCloudinaryUrl } from '../../utils/cloudinaryUrl'
import { formatDuration } from '../../utils/duration'
import MediaPlaceholder from '../common/MediaPlaceholder'

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
  const hasPhotoPost = hasVideos && item.videos.some((v) => v.kind === 'photo')
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
        className={`card-thumb ${!imageUrl ? 'has-placeholder' : item.bg || ''}`}
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
            src={getOptimizedCloudinaryUrl(imageUrl, { width: 450 })}
            alt={item.name}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <MediaPlaceholder
            item={item}
            isSalon={isSalon}
            isVideo={hasVideos}
          />
        )}
        {isOutOfStock ? (
          <span className="badge-new badge-danger">Out of Stock</span>
        ) : null}
        {isLowStock ? (
          <span className="badge-new">Low Stock</span>
        ) : null}
        {hasVideos ? (
          hasPhotoPost ? (
            <span
              className="badge-video badge-photo"
              title="TikTok photo gallery included"
              aria-label="TikTok photo gallery included"
            >
              <Images size={13} />
            </span>
          ) : (
            <span className="badge-video" title="Video included" aria-label="Video included">
              <Video size={13} />
            </span>
          )
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
              ? (formatDuration(item.duration) ? (
                  <><Clock3 size={14} aria-hidden="true" /> {formatDuration(item.duration)}</>
                ) : null)
              : isOutOfStock
                ? <><Ban size={14} aria-hidden="true" /> Out of stock</>
                : <><Package size={14} aria-hidden="true" /> {item.stock} left</>}
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
