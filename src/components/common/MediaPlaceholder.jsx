import { Gem, Play, Scissors, Sparkles } from 'lucide-react'

function MediaPlaceholder({
  item,
  isSalon,
  isVideo = false,
  className = '',
}) {
  const isSalonItem = isSalon ?? (item?.duration !== undefined)
  const bgClass = item?.bg || (isSalonItem ? 'sg1' : 'bg1')
  const itemName = item?.name || (isSalonItem ? 'Salon Style' : 'Bead Product')
  const variant = item?.variant

  return (
    <div
      className={`media-placeholder ${bgClass} ${className}`.trim()}
      aria-label={`${itemName}${variant ? ` - ${variant}` : ''}`}
      role="img"
    >
      <div className="media-placeholder-pattern" aria-hidden="true" />
      <div className="media-placeholder-content">
        <div className="media-placeholder-chip" aria-hidden="true">
          {isVideo ? (
            <Play size={20} fill="currentColor" />
          ) : isSalonItem ? (
            <Scissors size={20} />
          ) : (
            <Gem size={20} />
          )}
        </div>
        {isVideo ? (
          <span className="media-placeholder-video-label">
            <Sparkles size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
            Watch preview
          </span>
        ) : null}
        <span className="media-placeholder-name">{itemName}</span>
        {variant ? (
          <span className="badge-variant media-placeholder-variant">
            {variant}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default MediaPlaceholder
