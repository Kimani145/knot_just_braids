import formatCurrency from '../../utils/formatCurrency'

function StyleCard({ item, isSalon, onBook, onAddToCart }) {
  const imageUrl = item.image?.assetUrl || item.image?.previewUrl
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
        {!isSalon && item.stock !== undefined && item.stock <= 3 ? (
          <span className="badge-new">Low Stock</span>
        ) : null}
      </div>
      <div className="card-body">
        <h3>{item.name}</h3>
        <p className="desc">{item.desc}</p>
        <div className="card-meta">
          <span className="price">{formatCurrency(item.price)}</span>
          <span className="sub-info">
            {isSalon ? `⏱ ${item.duration}` : `📦 ${item.stock} left`}
          </span>
        </div>
        <button className="card-action" type="button" onClick={handleAction}>
          {isSalon ? 'Book this style →' : 'Add to Cart +'}
        </button>
      </div>
    </div>
  )
}

export default StyleCard
