import React, { useState } from 'react'
import { AlertTriangle, EyeOff, X } from 'lucide-react'

export default function CatalogLintBanner({ warnings = [], onBulkUnpublish, onEditItem }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!warnings.length) return null

  const placeholderWarnings = warnings.filter((w) => w.type === 'placeholder-content')
  const publishedFlagged = placeholderWarnings.filter((w) => w.status !== 'draft')

  const handleConfirmUnpublish = async () => {
    if (!onBulkUnpublish || !publishedFlagged.length) return
    setIsProcessing(true)
    try {
      await onBulkUnpublish(publishedFlagged)
      setShowConfirmModal(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="catalog-lint-banner" role="region" aria-label="Catalog Health Issues">
        <div className="catalog-lint-header" onClick={() => setIsExpanded((prev) => !prev)}>
          <div className="catalog-lint-title">
            <AlertTriangle size={18} className="catalog-lint-icon" />
            <span>
              <strong>Catalog Health:</strong> {warnings.length}{' '}
              {warnings.length === 1 ? 'issue' : 'issues'} detected
              {publishedFlagged.length > 0
                ? ` (${publishedFlagged.length} placeholder item${publishedFlagged.length === 1 ? '' : 's'} live)`
                : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {publishedFlagged.length > 0 && onBulkUnpublish ? (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirmModal(true)
                }}
              >
                <EyeOff size={12} style={{ marginRight: '4px' }} />
                Unpublish {publishedFlagged.length} flagged item{publishedFlagged.length === 1 ? '' : 's'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded((prev) => !prev)
              }}
            >
              {isExpanded ? 'Hide' : 'Review'}
            </button>
          </div>
        </div>

        {isExpanded ? (
          <ul className="catalog-lint-list">
            {warnings.map((warn) => (
              <li key={warn.id} className="catalog-lint-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`catalog-lint-tag tag-${warn.catalogType}`}>
                  {warn.catalogType === 'salon' ? 'SALON' : 'BEADS'}
                </span>
                <span className="catalog-lint-msg" style={{ flex: 1 }}>{warn.message}</span>
                {warn.type === 'photo-post-without-images' && onEditItem ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    onClick={() => onEditItem(warn.itemId, warn.catalogType)}
                  >
                    Add photos
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showConfirmModal ? (
        <div
          className="overlay open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulkUnpublishTitle"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="sheet"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-header">
              <h2 id="bulkUnpublishTitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <EyeOff size={18} /> Confirm Bulk Unpublish
              </h2>
              <button
                className="close-btn"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                aria-label="Close unpublish dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)' }}>
                The following <strong>{publishedFlagged.length}</strong> items contain placeholder or review text and will be set to <strong>Draft</strong>. They will immediately become hidden from customer catalog grids and cannot be booked or ordered.
              </p>

              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--surface2)',
                }}
              >
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {publishedFlagged.map((item) => (
                    <li key={item.id}>
                      <strong>{item.itemName}</strong>{' '}
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        ({item.catalogType === 'salon' ? 'Salon Style' : 'Bead Product'})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                <em>Note: This action is completely reversible. You can re-publish any item individually from the edit modal once details are finalized.</em>
              </p>

              <div className="security-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleConfirmUnpublish}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Unpublishing...' : `Unpublish ${publishedFlagged.length} Items`}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
