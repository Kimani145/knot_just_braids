import { useState } from 'react'
import { Play } from 'lucide-react'
import { buildPlayerSrc, buildWatchUrl } from '../../utils/tiktok'

function TikTokPlayer({
  video,
  item,
  isActiveSlide,
  isOpen,
  coverImage,
}) {
  const [hasUserTappedPlay, setHasUserTappedPlay] = useState(false)
  const [prevSlideState, setPrevSlideState] = useState({
    id: video?.id,
    isActiveSlide,
    isOpen,
  })

  // Reset play state during render when video, slide, or modal status changes
  if (
    video?.id !== prevSlideState.id ||
    isActiveSlide !== prevSlideState.isActiveSlide ||
    isOpen !== prevSlideState.isOpen
  ) {
    setPrevSlideState({
      id: video?.id,
      isActiveSlide,
      isOpen,
    })
    if (!isOpen || !isActiveSlide) {
      setHasUserTappedPlay(false)
    }
  }

  const isPlaying = Boolean(hasUserTappedPlay && isOpen && isActiveSlide)

  if (!video || !video.id) {
    return null
  }

  const playerSrc = buildPlayerSrc(video.id)
  const watchUrl = buildWatchUrl(video)
  const itemName = item?.name || 'Product'

  return (
    <div className="tiktok-player-wrapper">
      <div className="tiktok-player-container">
        {isPlaying && playerSrc ? (
          <iframe
            src={playerSrc}
            title={`TikTok video: ${itemName}`}
            className="tiktok-iframe"
            allow="fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="tiktok-facade-container">
            <button
              type="button"
              className={`tiktok-facade ${!coverImage ? item?.bg || 'bg1' : ''}`}
              onClick={() => setHasUserTappedPlay(true)}
              aria-label={`Play video: ${itemName}`}
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={itemName}
                  className="tiktok-facade-image"
                />
              ) : (
                <div className="tiktok-facade-emoji">{item?.emoji || '✨'}</div>
              )}
              <div className="tiktok-facade-overlay">
                <span className="tiktok-play-btn" aria-hidden="true">
                  <Play size={24} fill="currentColor" />
                </span>
                <span className="tiktok-facade-label">Tap to Play</span>
              </div>
            </button>
            <p className="tiktok-disclosure">
              Plays from TikTok (third party).{' '}
              <a href="/privacy" className="tiktok-disclosure-link">
                Privacy Policy
              </a>
            </p>
          </div>
        )}
      </div>

      {watchUrl ? (
        <div className="tiktok-fallback-bar">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tiktok-watch-link"
          >
            Watch on TikTok ↗
          </a>
        </div>
      ) : null}
    </div>
  )
}

export default TikTokPlayer
