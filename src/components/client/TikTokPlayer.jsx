import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Images, Play, RefreshCw, ExternalLink } from 'lucide-react'
import { buildWatchUrl } from '../../utils/tiktok'
import { PHOTO_EMBED_STRATEGY } from '../../utils/tiktokStrategy'
import {
  getIframeConfig,
  markPostFailed,
  isPostFailed,
  clearPostFailure,
} from '../../utils/tiktokProfiles'
import { getPlayerErrorInfo, isRetryableError } from '../../utils/tiktokErrors'
import MediaPlaceholder from '../common/MediaPlaceholder'

let preconnected = false
function preconnectTikTok() {
  if (preconnected || typeof document === 'undefined') return
  try {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = 'https://www.tiktok.com'
    document.head.appendChild(link)
    preconnected = true
  } catch {
    // Ignore in non-browser context
  }
}

function TikTokPlayer({
  video,
  item,
  isActiveSlide,
  isOpen,
  coverImage,
}) {
  const [hasUserTappedPlay, setHasUserTappedPlay] = useState(false)
  // 'idle' | 'loading' | 'ready' | 'fallback' | 'error' | 'timeout'
  const [playerStatus, setPlayerStatus] = useState('idle')
  const [errorCode, setErrorCode] = useState(null)
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
      setErrorCode(null)
    }
  }

  const isPlaying = Boolean(hasUserTappedPlay && isOpen && isActiveSlide)
  const isPhotoPost = video?.kind === 'photo'
  const itemName = item?.name || 'Product'
  const watchUrl = buildWatchUrl(video) || ''
  const handle = video?.handle || 'knot.justbraids'

  // Determine active profile for this media kind
  const activeProfile = isPhotoPost ? PHOTO_EMBED_STRATEGY : 'official-player'
  const iframeConfig = getIframeConfig(video, activeProfile)

  // Video/Photo postMessage listener & failure timeout
  useEffect(() => {
    if (!isPlaying || !iframeConfig) return

    // If strategy does not support postMessage (e.g. embed-v2), no timeout guessing
    if (!iframeConfig.supportsMessages) {
      return
    }

    // 8-second fallback timeout if onPlayerReady doesn't fire
    const timerId = setTimeout(() => {
      setPlayerStatus((current) => {
        if (current === 'loading') {
          if (video?.id) markPostFailed(video.id)
          return 'timeout'
        }
        return current
      })
    }, 8000)

    const handleMessage = (event) => {
      // 1. Mandatory origin check
      if (event.origin !== 'https://www.tiktok.com') return

      // 2. Mandatory source check to verify message is from our iframe's contentWindow
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return

      // 3. TikTok envelope validation
      if (!event.data || typeof event.data !== 'object') return
      if (event.data['x-tiktok-player'] !== true) return

      const { type, value } = event.data
      if (type === 'onPlayerReady') {
        clearTimeout(timerId)
        setPlayerStatus('ready')
      } else if (type === 'onPlayerError') {
        clearTimeout(timerId)
        if (video?.id) markPostFailed(video.id)
        setErrorCode(value)
        setPlayerStatus('error')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(timerId)
      window.removeEventListener('message', handleMessage)
    }
  }, [isPlaying, iframeConfig, video?.id])

  if (!video || !video.id) {
    return null
  }

  const handleStartPlay = () => {
    // If this post previously failed in this session, transition directly to fallback
    if (isPostFailed(video.id) || !iframeConfig) {
      setHasUserTappedPlay(true)
      setPlayerStatus('fallback')
      return
    }
    setHasUserTappedPlay(true)
    setPlayerStatus('loading')
    setErrorCode(null)
  }

  const handleRetry = () => {
    // Clear session failure on explicit user retry
    if (video.id) {
      clearPostFailure(video.id)
    }
    setPlayerStatus('loading')
    setErrorCode(null)
    if (iframeRef.current && iframeConfig?.src) {
      iframeRef.current.src = iframeConfig.src
    }
  }

  const isFailed = playerStatus === 'error' || playerStatus === 'timeout' || playerStatus === 'fallback'
  const errorInfo = isFailed
    ? playerStatus === 'timeout'
      ? getPlayerErrorInfo(3001)
      : playerStatus === 'fallback'
        ? {
            title: 'Hairstyle gallery on TikTok',
            desc: 'This TikTok photo gallery can be viewed directly on TikTok.',
          }
        : getPlayerErrorInfo(errorCode)
    : null

  const isPermanentError =
    playerStatus === 'fallback' ||
    errorInfo?.key === 'invalid-or-unsupported-media' ||
    !isRetryableError(errorCode)

  return (
    <div
      className="tiktok-player-wrapper"
      aria-label={`TikTok post by @${handle}`}
    >
      <div className="tiktok-player-container">
        {isPlaying ? (
          <>
            {isFailed || !iframeConfig ? (
              <div
                className="tiktok-fallback-card"
                role="region"
                aria-label={`TikTok ${isPhotoPost ? 'photo gallery' : 'video'} by @${handle}`}
              >
                <div className="tiktok-fallback-poster">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={itemName}
                      className="tiktok-fallback-img"
                    />
                  ) : (
                    <MediaPlaceholder
                      item={item}
                      isSalon={item?.duration !== undefined}
                      bare
                    />
                  )}
                </div>
                <div className="tiktok-fallback-content">
                  <span className="tiktok-fallback-handle">
                    {isPhotoPost ? (
                      <Images size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    ) : (
                      <Play size={14} fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    )}
                    @{handle}
                  </span>
                  <h3 className="tiktok-fallback-title">{itemName}</h3>
                  <p className="tiktok-fallback-desc">
                    {errorInfo?.desc ||
                      (isPhotoPost
                        ? 'Multi-photo hairstyle gallery available on TikTok.'
                        : 'Video preview available on TikTok.')}
                  </p>
                  <div className="tiktok-fallback-actions">
                    {watchUrl ? (
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tiktok-fallback-cta"
                      >
                        {isPhotoPost
                          ? 'View this hairstyle gallery on TikTok'
                          : 'Watch on TikTok'}
                        <ExternalLink size={14} style={{ marginLeft: 6 }} />
                      </a>
                    ) : null}
                    {!isPermanentError ? (
                      <button
                        type="button"
                        className="tiktok-btn-retry"
                        onClick={handleRetry}
                      >
                        <RefreshCw size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Retry
                      </button>
                    ) : null}
                  </div>
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
                {iframeConfig?.src ? (
                  <iframe
                    ref={iframeRef}
                    src={iframeConfig.src}
                    title={`TikTok ${isPhotoPost ? 'photos' : 'video'}: ${itemName}`}
                    className={`tiktok-iframe ${playerStatus === 'ready' ? 'loaded' : 'loading'}`}
                    allow={iframeConfig.allow}
                    sandbox={iframeConfig.sandbox || undefined}
                    referrerPolicy={iframeConfig.referrerPolicy}
                    loading="lazy"
                    onLoad={() => {
                      if (!iframeConfig.supportsMessages) {
                        setPlayerStatus('ready')
                      }
                    }}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <div className="tiktok-facade-container">
            <button
              type="button"
              className="tiktok-facade"
              onClick={handleStartPlay}
              onPointerDown={preconnectTikTok}
              onMouseEnter={preconnectTikTok}
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
                  bare
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
                <span className="tiktok-facade-title">{itemName}</span>
                <span className="tiktok-facade-label">
                  {isPhotoPost ? 'Tap to View Photos' : 'Tap to Play'}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TikTokPlayer
