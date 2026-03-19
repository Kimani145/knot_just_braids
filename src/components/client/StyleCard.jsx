import formatCurrency from '../../utils/formatCurrency'

function StyleCard({ item, isSalon, onBook, onAddToCart }) {
  const imageUrl = item.assetUrl || item.image?.assetUrl || item.image?.previewUrl
  const isOutOfStock = !isSalon && item.stock !== undefined && item.stock <= 0
  const isLowStock =
    !isSalon && item.stock !== undefined && item.stock > 0 && item.stock < 3

  const handleAction = () => {
    if (isSalon) {
      onBook?.(item)
      return
    }

    onAddToCart?.(item)
  }

  return (
    <div className="card">
      <div className={`card-thumb ${item.bg}`}>
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
          <span className="price">{formatCurrency(item.price)}</span>
          <span className="sub-info">
            {isSalon
              ? `⏱ ${item.duration}`
              : isOutOfStock
                ? '🚫 Out of stock'
                : `📦 ${item.stock} left`}
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
            : isOutOfStock
              ? 'Out of Stock'
              : 'Add to Cart +'}
        </button>
      </div>
    </div>
  )
}

export default StyleCard
