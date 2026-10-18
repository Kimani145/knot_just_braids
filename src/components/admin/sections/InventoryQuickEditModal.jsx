import React from 'react'
import { Info, X } from 'lucide-react'
import ImageUploader from '../ImageUploader'
import VideoLinksField from '../VideoLinksField'

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
              <label>{editForm.pricingType === 'range' ? 'Minimum Price' : 'Price'}</label>
              <input
                type="text"
                value={editForm.priceDisplay}
                onChange={onChange('price')}
                placeholder="Kshs 120"
              />
            </div>

            {editForm.pricingType === 'range' ? (
              <div className="fg">
                <label>Maximum Price</label>
                <input
                  type="text"
                  value={editForm.priceMaxDisplay}
                  onChange={onChange('priceMax')}
                  placeholder="Kshs 250"
                />
              </div>
            ) : null}

            <div className="fg">
              <label>Variant (Optional)</label>
              <input
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
                <label>Duration</label>
                <input
                  type="text"
                  value={editForm.duration}
                  onChange={onChange('duration')}
                  placeholder="5–7 hrs"
                />
              </div>
            ) : (
              <div className="fg">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  value={editForm.stock}
                  onChange={onChange('stock')}
                  placeholder="10"
                />
              </div>
            )}

            <div className="fg">
              <label>Description</label>
              <textarea
                value={editForm.desc}
                onChange={onChange('desc')}
                placeholder="Short product or style description"
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
                {isSaving ? 'Saving...' : 'Save Changes'}
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
