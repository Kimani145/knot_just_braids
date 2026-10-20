import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Images, Play, RefreshCw, ExternalLink } from 'lucide-react'
import { buildPlayerSrc, buildWatchUrl } from '../../utils/tiktok'
import { getPlayerErrorInfo } from '../../utils/tiktokErrors'
import { fetchTikTokOEmbed, loadTikTokEmbedScript, mountOEmbedHtml } from '../../utils/tiktokOembed'
import MediaPlaceholder from '../common/MediaPlaceholder'

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
  const oembedRef = useRef(null)

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
  const isVideoPost = video?.kind === 'video' || (!video?.kind && Boolean(video?.id))
  const itemName = item?.name || 'Product'
  const watchUrl = buildWatchUrl(video) || ''
  const handle = video?.handle || 'knot.justbraids'

  // Photo mode oEmbed resolver
  useEffect(() => {
    if (!isPlaying || !isPhotoPost) return

    let isMounted = true

    // 8-second timeout for oEmbed resolution
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setPlayerStatus('fallback')
      }
    }, 8000)

    fetchTikTokOEmbed(watchUrl).then((result) => {
      if (!isMounted) return
      clearTimeout(timeoutId)

      if (result.ok && result.html && oembedRef.current) {
        mountOEmbedHtml(oembedRef.current, result.html)
        loadTikTokEmbedScript()
        setPlayerStatus('ready')
      } else {
        setPlayerStatus('fallback')
      }
    }).catch(() => {
      if (isMounted) {
        clearTimeout(timeoutId)
        setPlayerStatus('fallback')
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [isPlaying, isPhotoPost, watchUrl])

  // Video postMessage listener & 8-second failure timeout
  useEffect(() => {
    if (!isPlaying || !isVideoPost) return

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

      const { type, value } = event.data
      if (type === 'onPlayerReady') {
        clearTimeout(timerId)
        setPlayerStatus('ready')
      } else if (type === 'onPlayerError') {
        clearTimeout(timerId)
        setErrorCode(value)
        setPlayerStatus('error')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(timerId)
      window.removeEventListener('message', handleMessage)
    }
  }, [isPlaying, isVideoPost, video?.id])

  if (!video || !video.id) {
    return null
  }

  // Strictly forbid /player/v1/ for photo posts
  const playerSrc = isPhotoPost ? null : buildPlayerSrc(video.id)

  const handleStartPlay = () => {
    setHasUserTappedPlay(true)
    setPlayerStatus('loading')
    setErrorCode(null)
  }

  const handleRetry = () => {
    setPlayerStatus('loading')
    setErrorCode(null)
    if (iframeRef.current && playerSrc) {
      iframeRef.current.src = playerSrc
    }
  }

  const isFailed = playerStatus === 'error' || playerStatus === 'timeout'
  const errorInfo = isFailed
    ? playerStatus === 'timeout'
      ? getPlayerErrorInfo(3001)
      : getPlayerErrorInfo(errorCode)
    : null

  const isPermanentError = errorInfo?.key === 'invalid-or-unsupported-media'

  return (
    <div
      className="tiktok-player-wrapper"
      aria-label={`TikTok post by @${handle}`}
    >
      <div className="tiktok-player-container">
        {isPlaying ? (
          <>
            {isPhotoPost ? (
              playerStatus === 'fallback' ? (
                <div
                  className="tiktok-fallback-card"
                  role="region"
                  aria-label={`TikTok photo gallery by @${handle}`}
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
                      <Images size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      @{handle}
                    </span>
                    <h3 className="tiktok-fallback-title">{itemName}</h3>
                    <p className="tiktok-fallback-desc">
                      Multi-photo hairstyle gallery available on TikTok.
                    </p>
                    {watchUrl ? (
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tiktok-fallback-cta"
                      >
                        View this hairstyle gallery on TikTok
                        <ExternalLink size={14} style={{ marginLeft: 6 }} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  ref={oembedRef}
                  className={`tiktok-photo-container ${playerStatus === 'ready' ? 'loaded' : 'loading'}`}
                  aria-label={`TikTok photo carousel for ${itemName}`}
                >
                  {playerStatus === 'loading' ? (
                    <div className="tiktok-loading-spinner" aria-label="Loading TikTok post">
                      <div className="spinner-ring" />
                      <span>Loading gallery from TikTok...</span>
                    </div>
                  ) : null}
                </div>
              )
            ) : isFailed ? (
              <div className="tiktok-error-state" role="alert">
                <AlertCircle size={28} className="tiktok-error-icon" />
                <p className="tiktok-error-title">{errorInfo.title}</p>
                <p className="tiktok-error-desc">{errorInfo.desc}</p>
                <div className="tiktok-error-actions">
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
            ) : (
              <>
                {playerStatus === 'loading' ? (
                  <div className="tiktok-loading-spinner" aria-label="Loading TikTok player">
                    <div className="spinner-ring" />
                    <span>Connecting to TikTok...</span>
                  </div>
                ) : null}
                {playerSrc ? (
                  <iframe
                    ref={iframeRef}
                    src={playerSrc}
                    title={`TikTok video: ${itemName}`}
                    className={`tiktok-iframe ${playerStatus === 'ready' ? 'loaded' : 'loading'}`}
                    allow="fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
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
