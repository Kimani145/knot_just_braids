import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Images, Play, RefreshCw } from 'lucide-react'
import { buildPlayerSrc, buildWatchUrl } from '../../utils/tiktok'
import MediaPlaceholder from '../common/MediaPlaceholder'

function TikTokPlayer({
  video,
  item,
  isActiveSlide,
  isOpen,
  coverImage,
}) {
  const [hasUserTappedPlay, setHasUserTappedPlay] = useState(false)
  const [playerStatus, setPlayerStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error' | 'timeout'
  const iframeRef = useRef(null)

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
      setPlayerStatus('idle')
    }
  }

  const isPlaying = Boolean(hasUserTappedPlay && isOpen && isActiveSlide)
  const isPhotoPost = video?.kind === 'photo'

  // PostMessage listener & 8-second failure timeout
  useEffect(() => {
    if (!isPlaying) return

    // 8-second fallback timeout if onPlayerReady doesn't fire
    const timerId = setTimeout(() => {
      setPlayerStatus((current) => (current === 'loading' ? 'timeout' : current))
    }, 8000)

    const handleMessage = (event) => {
      // 1. Mandatory origin check
      if (event.origin !== 'https://www.tiktok.com') return

      // 2. Mandatory source check to verify message is from our iframe's contentWindow
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return

      // 3. TikTok envelope validation
      if (!event.data || typeof event.data !== 'object') return
      if (event.data['x-tiktok-player'] !== true) return

      const { type } = event.data
      if (type === 'onPlayerReady') {
        clearTimeout(timerId)
        setPlayerStatus('ready')
      } else if (type === 'onPlayerError') {
        clearTimeout(timerId)
        setPlayerStatus('error')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(timerId)
      window.removeEventListener('message', handleMessage)
    }
  }, [isPlaying, video?.id])

  if (!video || !video.id) {
    return null
  }

  const playerSrc = buildPlayerSrc(video.id)
  const watchUrl = buildWatchUrl(video)
  const itemName = item?.name || 'Product'

  const handleStartPlay = () => {
    setHasUserTappedPlay(true)
    setPlayerStatus('loading')
  }

  const handleRetry = () => {
    setPlayerStatus('loading')
    if (iframeRef.current && playerSrc) {
      iframeRef.current.src = playerSrc
    }
  }

  const isFailed = playerStatus === 'error' || playerStatus === 'timeout'

  return (
    <div className="tiktok-player-wrapper">
      <div className="tiktok-player-container">
        {isPlaying && playerSrc ? (
          <>
            {isFailed ? (
              <div className="tiktok-error-state" role="alert">
                <AlertCircle size={28} className="tiktok-error-icon" />
                <p className="tiktok-error-title">
                  {playerStatus === 'timeout'
                    ? 'Player timed out on your network.'
                    : 'This TikTok post cannot be embedded directly.'}
                </p>
                <p className="tiktok-error-desc">
                  Slow mobile connection or embedding restricted by TikTok.
                </p>
                <div className="tiktok-error-actions">
                  {watchUrl ? (
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tiktok-btn-watch"
                    >
                      {isPhotoPost ? 'View Photos on TikTok ↗' : 'Watch on TikTok ↗'}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="tiktok-btn-retry"
                    onClick={handleRetry}
                  >
                    <RefreshCw size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {playerStatus === 'loading' ? (
                  <div className="tiktok-loading-spinner" aria-label="Loading TikTok player">
                    <div className="spinner-ring" />
                    <span>Connecting to TikTok...</span>
                  </div>
                ) : null}
                <iframe
                  ref={iframeRef}
                  src={playerSrc}
                  title={`TikTok ${isPhotoPost ? 'photo gallery' : 'video'}: ${itemName}`}
                  className={`tiktok-iframe ${playerStatus === 'ready' ? 'loaded' : 'loading'}`}
                  allow="fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                />
              </>
            )}
          </>
        ) : (
          <div className="tiktok-facade-container">
            <button
              type="button"
              className="tiktok-facade"
              onClick={handleStartPlay}
              aria-label={`Play TikTok ${isPhotoPost ? 'photo gallery' : 'video'}: ${itemName}`}
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={itemName}
                  className="tiktok-facade-image"
                />
              ) : (
                <MediaPlaceholder
                  item={item}
                  isSalon={item?.duration !== undefined}
                  isVideo
                />
              )}
              {isPhotoPost ? (
                <div className="badge-photo-overlay" aria-label="Photo post">
                  <Images size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <span>Images</span>
                </div>
              ) : null}
              <div className="tiktok-facade-overlay">
                <span className="tiktok-play-btn" aria-hidden="true">
                  {isPhotoPost ? (
                    <Images size={24} />
                  ) : (
                    <Play size={24} fill="currentColor" />
                  )}
                </span>
                <span className="tiktok-facade-label">
                  {isPhotoPost ? 'Tap to View Photos' : 'Tap to Play'}
                </span>
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
    </div>
  )
}

export default TikTokPlayer
