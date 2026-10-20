import React from 'react'
import { Info, X } from 'lucide-react'
import ImageUploader from '../ImageUploader'
import VideoLinksField from '../VideoLinksField'
import formatCurrency from '../../../utils/formatCurrency'

export default function InventoryQuickEditModal({
  editForm,
  feedback,
  isSaving,
  onChange,
  onClose,
  onSubmit,
  onAssetUpload,
}) {
  const isOpen = Boolean(editForm.id)

  const handleMoveDescToInternalNote = () => {
    const currentDesc = editForm.desc ? editForm.desc.trim() : ''
    if (!currentDesc) return

    // Move verbatim into internalNote
    onChange('internalNote')({ target: { value: currentDesc } })
    // Leave description empty
    onChange('desc')({ target: { value: '' } })
    // Allowed for drafts, switch status to draft
    onChange('status')({ target: { value: 'draft' } })
  }

  return (
    <div
      className={`overlay${isOpen ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventoryQuickEditTitle"
    >
      <div className="sheet quick-edit-sheet">
        <div className="sheet-header">
          <h2 id="inventoryQuickEditTitle">
            {editForm.type === 'salon' ? 'Edit Hair Style' : 'Edit Bead Product'}
          </h2>
          <button
            className="close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close edit modal"
          >
            <X size={18} />
          </button>
        </div>

        {isOpen ? (
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="note">
              Updating <strong>{editForm.name}</strong>
            </div>

            <div className="fg">
              <label>Publish Status</label>
              <div className="pricing-toggle">
                <button
                  type="button"
                  className={`pricing-toggle-btn${editForm.status !== 'draft' ? ' active' : ''}`}
                  onClick={() => onChange('status')({ target: { value: 'published' } })}
                >
                  Published (Live)
                </button>
                <button
                  type="button"
                  className={`pricing-toggle-btn${editForm.status === 'draft' ? ' active' : ''}`}
                  onClick={() => onChange('status')({ target: { value: 'draft' } })}
                >
                  Draft (Hidden)
                </button>
              </div>
            </div>

            <div className="fg">
              <label>Pricing Type</label>
              <div className="pricing-toggle">
                <button
                  type="button"
                  className={`pricing-toggle-btn${editForm.pricingType === 'fixed' ? ' active' : ''}`}
                  onClick={onChange('pricingType')}
                  value="fixed"
                >
                  Fixed price
                </button>
                <button
                  type="button"
                  className={`pricing-toggle-btn${editForm.pricingType === 'range' ? ' active' : ''}`}
                  onClick={onChange('pricingType')}
                  value="range"
                >
                  Price range
                </button>
              </div>
            </div>

            <div className="fg">
              <label htmlFor="inventory-edit-price-input">
                {editForm.pricingType === 'range' ? 'Minimum Price (KSh)' : 'Price (KSh)'}
              </label>
              <input
                id="inventory-edit-price-input"
                name="price"
                type="text"
                inputMode="numeric"
                value={editForm.price}
                onChange={onChange('price')}
                placeholder="e.g. 1500"
              />
              {editForm.price ? (
                <span className="a-hint" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                  Preview: {formatCurrency(editForm.price)}
                </span>
              ) : null}
            </div>

            {editForm.pricingType === 'range' ? (
              <div className="fg">
                <label htmlFor="inventory-edit-price-max-input">Maximum Price (KSh)</label>
                <input
                  id="inventory-edit-price-max-input"
                  name="priceMax"
                  type="text"
                  inputMode="numeric"
                  value={editForm.priceMax}
                  onChange={onChange('priceMax')}
                  placeholder="e.g. 2500"
                />
                {editForm.priceMax ? (
                  <span className="a-hint" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                    Preview: {formatCurrency(editForm.priceMax)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="fg">
              <label htmlFor="inventory-edit-variant-input">Variant (Optional)</label>
              <input
                id="inventory-edit-variant-input"
                name="variant"
                type="text"
                list="inventory-edit-variants"
                value={editForm.variant || ''}
                onChange={onChange('variant')}
                placeholder="e.g. Hand-painted, Original finish"
              />
              <datalist id="inventory-edit-variants">
                <option value="Hand-painted" />
                <option value="Original finish" />
                <option value="Natural" />
                <option value="With extensions" />
                <option value="Custom color" />
              </datalist>
            </div>

            {editForm.type === 'salon' ? (
              <div className="fg">
                <label htmlFor="inventory-edit-duration-input">Duration</label>
                <input
                  id="inventory-edit-duration-input"
                  name="duration"
                  type="text"
                  value={editForm.duration}
                  onChange={onChange('duration')}
                  placeholder="5–7 hrs"
                />
              </div>
            ) : (
              <div className="fg">
                <label htmlFor="inventory-edit-stock-input">Stock Quantity</label>
                <input
                  id="inventory-edit-stock-input"
                  name="stock"
                  type="number"
                  value={editForm.stock}
                  onChange={onChange('stock')}
                  placeholder="10"
                />
              </div>
            )}

            <div className="fg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label htmlFor="inventory-edit-desc-input" style={{ margin: 0 }}>Description</label>
                {editForm.desc?.trim() ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    onClick={handleMoveDescToInternalNote}
                    title="Move customer description into internal notes and mark item as Draft"
                  >
                    Move this text to internal note
                  </button>
                ) : null}
              </div>
              <textarea
                id="inventory-edit-desc-input"
                name="description"
                value={editForm.desc}
                onChange={onChange('desc')}
                placeholder="Customer-visible description (required when publishing, optional for drafts)"
              />
            </div>

            <div className="fg">
              <label htmlFor="inventory-edit-internal-note-input">Internal Note (Admin Only)</label>
              <textarea
                id="inventory-edit-internal-note-input"
                name="internalNote"
                value={editForm.internalNote || ''}
                onChange={onChange('internalNote')}
                placeholder="Private staff notes, styling considerations, or review reminders (never customer-visible)"
              />
            </div>

            <div className="fg">
              <label>{editForm.type === 'salon' ? 'Style Image' : 'Product Images'}</label>
              <ImageUploader
                onUpload={(asset) => onAssetUpload?.(asset, editForm.type)}
                selectedAsset={editForm.image}
                selectedAssets={editForm.images}
                allowMultiple={editForm.type === 'beads'}
              />
            </div>

            <VideoLinksField
              videos={editForm.videos}
              onChange={(nextVideos) =>
                onChange('videos')({ target: { value: nextVideos } })
              }
              pendingUrl={editForm.pendingVideoUrl}
              onPendingUrlChange={(nextUrl) =>
                onChange('pendingVideoUrl')({ target: { value: nextUrl } })
              }
              idPrefix="inventory-edit-video"
            />

            {editForm.videos?.length > 0 &&
            !editForm.image &&
            (!editForm.images || editForm.images.length === 0) ? (
              <div className="a-hint-box" role="status">
                <Info size={14} className="a-hint-icon" />
                <span>
                  <strong>Cover photo recommended:</strong> You've attached a
                  TikTok post. Adding a cover photo ensures customers on slow
                  networks see an instant preview before playing.
                </span>
              </div>
            ) : null}

            {feedback ? (
              <p
                className={`admin-auth-feedback ${
                  feedback.type === 'error'
                    ? 'admin-auth-feedback-error'
                    : 'admin-auth-feedback-success'
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            <div className="security-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSaving}
                style={{
                  background:
                    editForm.type === 'salon'
                      ? 'var(--salon-accent)'
                      : 'var(--bead-accent)',
                }}
              >
                {isSaving ? 'Saving...' : editForm.status === 'draft' ? 'Save as Draft' : 'Save Changes'}
              </button>
              <button className="btn btn-outline" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
