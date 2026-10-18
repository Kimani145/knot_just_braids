import React from 'react'
import { Info, Pencil, Trash2, Video } from 'lucide-react'
import AdminPanel from '../AdminPanel'
import ImageUploader from '../ImageUploader'
import VideoLinksField from '../VideoLinksField'
import { formatPriceRange } from '../../../utils/pricingUtils'

export default function SalonManager({
  salonStyles = [],
  loadingSalon = false,
  salonForm,
  salonFormErrors,
  salonUploadReset,
  onSalonChange,
  onSalonFieldBlur,
  onAddSalon,
  onAssetUpload,
  onOpenInventoryEdit,
  onDeleteSalon,
  onUpdateVideos,
  onUpdatePendingVideoUrl,
  onClearSelectedAsset,
  getItemAssetUrl,
  renderSkeletonRows,
}) {
  return (
    <AdminPanel
      title="Hair Styles Gallery"
      tagLabel="SALON"
      tagClass="tag-salon"
      panelId="admin-salon-panel"
    >
      <form
        className="admin-form tour-add-hair-form"
        style={{ marginBottom: '1rem' }}
        onSubmit={onAddSalon}
      >
        <div className="a-fg">
          <label className="a-label">Style Name</label>
          <input
            className={salonFormErrors.name ? 'a-input invalid' : 'a-input'}
            placeholder="Knotless Braids"
            value={salonForm.name}
            onChange={onSalonChange('name')}
            onBlur={onSalonFieldBlur('name')}
          />
          {salonFormErrors.name ? (
            <span className="a-error">{salonFormErrors.name}</span>
          ) : null}
        </div>
        <div className="a-fg">
          <label className="a-label">Variant (Optional)</label>
          <input
            className="a-input"
            list="salon-variant-options"
            placeholder="e.g. Natural, With extensions"
            value={salonForm.variant || ''}
            onChange={onSalonChange('variant')}
          />
          <datalist id="salon-variant-options">
            <option value="Natural" />
            <option value="With extensions" />
            <option value="Ombre" />
            <option value="Shoulder length" />
            <option value="Waist length" />
          </datalist>
        </div>
        <div className="a-fg full">
          <label className="a-label">Pricing Type</label>
          <div className="pricing-toggle">
            <button
              type="button"
              className={`pricing-toggle-btn${salonForm.pricingType === 'fixed' ? ' active' : ''}`}
              onClick={onSalonChange('pricingType')}
              value="fixed"
            >
              Fixed price
            </button>
            <button
              type="button"
              className={`pricing-toggle-btn${salonForm.pricingType === 'range' ? ' active' : ''}`}
              onClick={onSalonChange('pricingType')}
              value="range"
            >
              Price range
            </button>
          </div>
        </div>
        <div className="a-fg">
          <label className="a-label">
            {salonForm.pricingType === 'range' ? 'Minimum Price' : 'Price'}
          </label>
          <input
            className={salonFormErrors.price ? 'a-input invalid' : 'a-input'}
            placeholder="Kshs 120"
            value={salonForm.priceDisplay}
            onChange={onSalonChange('price')}
            onBlur={onSalonFieldBlur('price')}
          />
          {salonFormErrors.price ? (
            <span className="a-error">{salonFormErrors.price}</span>
          ) : null}
        </div>
        {salonForm.pricingType === 'range' ? (
          <div className="a-fg">
            <label className="a-label">Maximum Price</label>
            <input
              className={salonFormErrors.priceMax ? 'a-input invalid' : 'a-input'}
              placeholder="Kshs 250"
              value={salonForm.priceMaxDisplay}
              onChange={onSalonChange('priceMax')}
              onBlur={onSalonFieldBlur('priceMax')}
            />
            {salonFormErrors.priceMax ? (
              <span className="a-error">{salonFormErrors.priceMax}</span>
            ) : null}
          </div>
        ) : null}
        <div className="a-fg">
          <label className="a-label">Duration</label>
          <input
            className="a-input"
            placeholder="5–7 hrs"
            value={salonForm.duration}
            onChange={onSalonChange('duration')}
          />
        </div>
        <div className="a-fg">
          <label className="a-label">Style Image</label>
          <ImageUploader
            onUpload={(asset) => onAssetUpload(asset, 'salon')}
            resetSignal={salonUploadReset}
            selectedAsset={salonForm.image}
          />
        </div>
        <div className="a-fg">
          <label className="a-label">Emoji (Fallback)</label>
          <input
            className="a-input"
            placeholder="🌿"
            maxLength={2}
            value={salonForm.emoji}
            onChange={onSalonChange('emoji')}
          />
        </div>
        <div className="a-fg full">
          <label className="a-label">Description</label>
          <input
            className={salonFormErrors.desc ? 'a-input invalid' : 'a-input'}
            placeholder="Short style description"
            value={salonForm.desc}
            onChange={onSalonChange('desc')}
            onBlur={onSalonFieldBlur('desc')}
          />
          {salonFormErrors.desc ? (
            <span className="a-error">{salonFormErrors.desc}</span>
          ) : null}
        </div>
        {salonForm.image?.source === 'gallery' && salonForm.image?.assetUrl ? (
          <div className="a-fg full">
            <div className="selected-asset-card">
              <img
                src={salonForm.image.assetUrl}
                alt={salonForm.image.fileName || 'Selected asset'}
              />
              <div className="selected-asset-copy">
                <strong>{salonForm.image.fileName || 'Selected gallery asset'}</strong>
                <span>
                  {salonForm.image.internalNote || 'This asset will be used when you publish.'}
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => onClearSelectedAsset('salon')}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
        <VideoLinksField
          videos={salonForm.videos}
          onChange={onUpdateVideos}
          pendingUrl={salonForm.pendingVideoUrl}
          onPendingUrlChange={onUpdatePendingVideoUrl}
          idPrefix="salon-video"
        />
        {salonForm.videos.length > 0 && !salonForm.image?.assetUrl ? (
          <div className="a-hint-box" role="status">
            <Info size={14} className="a-hint-icon" />
            <span>
              <strong>Cover photo recommended:</strong> You've attached a
              TikTok post. Adding a cover photo ensures customers on
              slow networks see an instant preview before playing.
            </span>
          </div>
        ) : null}
        <div className="a-fg full">
          <button className="a-add-btn" type="submit">
            ＋ Add Hair Style
          </button>
        </div>
      </form>

      <div id="adminSalonList">
        {loadingSalon ? (
          renderSkeletonRows(4, 'salon')
        ) : salonStyles.length ? (
          salonStyles.map((item) => (
            <div className="a-item-row" key={item.id}>
              <span className="emoji">
                {getItemAssetUrl(item) ? (
                  <img
                    src={getItemAssetUrl(item)}
                    alt={item.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '0.35rem',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  item.emoji
                )}
              </span>
              <span className="name">{item.name}</span>
              {item.variant ? (
                <span className="a-variant-badge" title={`Variant: ${item.variant}`}>
                  {item.variant}
                </span>
              ) : null}
              {item.videos?.length > 0 ? (
                <span className="a-video-badge" title={`${item.videos.length} video(s)`}>
                  <Video size={12} /> {item.videos.length}
                </span>
              ) : null}
              <span className="sub">
                {formatPriceRange(item.price, item.priceMax, item.pricingType)} · {item.duration}
              </span>
              <div className="a-row-actions">
                <button
                  className="a-edit"
                  onClick={() => onOpenInventoryEdit('salon', item)}
                  type="button"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="a-del"
                  onClick={() => onDeleteSalon(item.id)}
                  type="button"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
            No styles added yet.
          </p>
        )}
      </div>
    </AdminPanel>
  )
}
