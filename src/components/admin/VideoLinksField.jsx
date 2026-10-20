import { useMemo } from 'react'
import { AlertCircle, CheckCircle2, ExternalLink, Images, Play, Trash2 } from 'lucide-react'
import {
  MAX_VIDEOS_PER_ITEM,
  TIKTOK_URL_ERRORS,
  buildWatchUrl,
  parseTikTokUrl,
} from '../../utils/tiktok'

function VideoLinksField({
  videos = [],
  onChange,
  pendingUrl = '',
  onPendingUrlChange,
  idPrefix = 'video',
}) {
  const isMaxReached = videos.length >= MAX_VIDEOS_PER_ITEM

  const validation = useMemo(() => {
    const trimmed = pendingUrl.trim()
    if (!trimmed) return null

    const result = parseTikTokUrl(trimmed)
    if (!result.ok) {
      return {
        type: 'error',
        message: TIKTOK_URL_ERRORS[result.reason] || 'Invalid TikTok URL.',
      }
    }

    const isDuplicate = videos.some((v) => v.id === result.id)
    if (isDuplicate) {
      return {
        type: 'error',
        message: 'This TikTok post has already been added to this item.',
      }
    }

    const typeLabel = result.kind === 'photo' ? 'photo post' : 'video'
    return {
      type: 'success',
      message: `Valid TikTok ${typeLabel} by @${result.handle} (ID: ${result.id.slice(0, 4)}...${result.id.slice(-4)})`,
      parsed: result,
    }
  }, [pendingUrl, videos])

  const handleAddVideo = () => {
    if (isMaxReached || !validation || validation.type !== 'success') {
      return
    }

    const nextVideos = [
      ...videos,
      {
        provider: 'tiktok',
        id: validation.parsed.id,
        handle: validation.parsed.handle,
        kind: validation.parsed.kind || 'video',
      },
    ]

    onChange?.(nextVideos)
    onPendingUrlChange?.('')
  }

  const handleRemoveVideo = (indexToRemove) => {
    const nextVideos = videos.filter((_, idx) => idx !== indexToRemove)
    onChange?.(nextVideos)
  }

  return (
    <div className="a-fg full a-video-links-field">
      <div className="a-video-header">
        <label className="a-label" htmlFor={`${idPrefix}-url-input`}>
          TikTok Videos & Photos ({videos.length}/{MAX_VIDEOS_PER_ITEM})
        </label>
      </div>

      {videos.length > 0 ? (
        <ul className="a-video-list" aria-label="Added TikTok media">
          {videos.map((vid, index) => (
            <li className="a-video-item" key={`video-${vid.id}-${index}`}>
              <div className="a-video-item-info">
                <span className="a-video-item-icon" aria-hidden="true">
                  {vid.kind === 'photo' ? (
                    <Images size={13} />
                  ) : (
                    <Play size={13} fill="currentColor" />
                  )}
                </span>
                <span className="a-video-item-handle">
                  {vid.kind === 'photo' ? 'Photo post' : 'Video'} · @{vid.handle} · ...{String(vid.id || '').slice(-4)}
                </span>
                <a
                  href={buildWatchUrl(vid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-video-external-link"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    textDecoration: 'underline',
                  }}
                  title="Open this post on TikTok"
                >
                  <span>Open on TikTok</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <button
                type="button"
                className="a-video-remove-btn"
                onClick={() => handleRemoveVideo(index)}
                aria-label={`Remove TikTok post @${vid.handle}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!isMaxReached ? (
        <div className="a-video-input-wrapper">
          <div className="a-video-input-row">
            <input
              id={`${idPrefix}-url-input`}
              className={`a-input ${validation?.type === 'error' ? 'invalid' : ''}`}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://www.tiktok.com/@handle/video/... or /photo/..."
              value={pendingUrl}
              onChange={(e) => onPendingUrlChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddVideo()
                }
              }}
            />
            <button
              type="button"
              className="a-btn a-btn-add-video"
              onClick={handleAddVideo}
              disabled={!validation || validation.type !== 'success'}
            >
              {validation?.parsed?.kind === 'photo' ? 'Add Photos' : 'Add Video'}
            </button>
          </div>

          {validation?.type === 'error' ? (
            <p className="a-error" role="alert">
              <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
              {validation.message}
            </p>
          ) : null}

          {validation?.type === 'success' ? (
            <p className="a-video-success-preview">
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
              {validation.message}
            </p>
          ) : null}

          <p className="a-help-text">
            Tip: To embed from the TikTok app, open the link in your phone browser first, then copy the URL from the browser bar.
          </p>
        </div>
      ) : (
        <p className="a-help-text">
          Maximum of {MAX_VIDEOS_PER_ITEM} videos reached for this item. Remove one to add a new link.
        </p>
      )}
    </div>
  )
}

export default VideoLinksField
