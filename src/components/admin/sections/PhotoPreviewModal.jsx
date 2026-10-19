import React from 'react'
import { Download, X } from 'lucide-react'

export default function PhotoPreviewModal({ photoUrl, onClose }) {
  if (!photoUrl) return null

  return (
    <div
      className="overlay open"
      onClick={onClose}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="previewPhotoTitle"
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          width: '90%',
          height: 'auto',
          maxHeight: '90vh',
          padding: '1.5rem',
          background: 'var(--bg-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="sheet-header">
          <h2 id="previewPhotoTitle">Reference Photo</h2>
          <button
            className="close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close photo preview"
          >
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            margin: '1rem 0',
          }}
        >
          <img
            src={photoUrl}
            alt="Reference"
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </div>
        <a
          href={photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="btn btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          <Download size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{' '}
          Download / View Full Image
        </a>
      </div>
    </div>
  )
}
