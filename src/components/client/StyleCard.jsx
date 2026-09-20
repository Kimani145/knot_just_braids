import { useState } from 'react'
import { Ban, Clock3, Package } from 'lucide-react'
import formatCurrency from '../../utils/formatCurrency'
import ProductQuickView from './ProductQuickView'

function StyleCard({ item, isSalon, onBook, onAddToCart, onInquire }) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const pricingType = item.pricingType === 'range' ? 'range' : 'fixed'
  const imageUrl = item.images?.[0] || item.assetUrl || item.image?.assetUrl || item.image?.previewUrl
  const isRangeProduct = !isSalon && pricingType === 'range'
  const isOutOfStock =
    !isSalon && !isRangeProduct && item.stock !== undefined && item.stock <= 0
  const isLowStock =
    !isSalon && !isRangeProduct && item.stock !== undefined && item.stock > 0 && item.stock < 3
  const showPrice =
    pricingType === 'range'
      ? `${formatCurrency(item.price)} – ${formatCurrency(item.priceMax)}`
      : formatCurrency(item.price)

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
        onClick={() => setIsQuickViewOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsQuickViewOpen(true)
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
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
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
      <ProductQuickView
        isOpen={isQuickViewOpen}
        item={item}
        isSalon={isSalon}
        onClose={() => setIsQuickViewOpen(false)}
        onBook={onBook}
        onAddToCart={onAddToCart}
        onInquire={onInquire}
      />
    </div>
  )
}

export default StyleCard
