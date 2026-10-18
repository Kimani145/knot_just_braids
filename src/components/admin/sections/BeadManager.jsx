import React from 'react'
import { Info, Pencil, Trash2, Video } from 'lucide-react'
import AdminPanel from '../AdminPanel'
import ImageUploader from '../ImageUploader'
import VideoLinksField from '../VideoLinksField'
import { formatPriceRange } from '../../../utils/pricingUtils'

export default function BeadManager({
  beadProducts = [],
  loadingBeads = false,
  lowStockItems = [],
  outOfStockItems = [],
  beadForm,
  beadFormErrors,
  beadUploadReset,
  onBeadChange,
  onBeadFieldBlur,
  onAddBead,
  onAssetUpload,
  onOpenInventoryEdit,
  onDeleteBead,
  onUpdateVideos,
  onUpdatePendingVideoUrl,
  onClearSelectedAsset,
  getItemAssetUrl,
  renderSkeletonRows,
}) {
  return (
    <AdminPanel
      title="Beadwork Products"
      tagLabel="SHOP"
      tagClass="tag-beads"
      panelId="admin-beads-panel"
    >
      {lowStockItems.length || outOfStockItems.length ? (
        <div className="inventory-alert-stack">
          {outOfStockItems.length ? (
            <div className="inventory-alert danger">
              <strong>Out of Stock</strong>
              <span>{outOfStockItems.map((item) => item.name).join(', ')}</span>
            </div>
          ) : null}
          {lowStockItems.length ? (
            <div className="inventory-alert warning">
              <strong>Low Stock</strong>
              <span>{lowStockItems.map((item) => item.name).join(', ')}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="admin-form tour-add-bead-form"
        style={{ marginBottom: '1rem' }}
        onSubmit={onAddBead}
      >
        <div className="a-group full">
          <h4 className="a-group-title">Basics</h4>
          <div className="a-fg">
            <label className="a-label">Product Name</label>
            <input
              className={beadFormErrors.name ? 'a-input invalid' : 'a-input'}
              placeholder="Waist Beads"
              value={beadForm.name}
              onChange={onBeadChange('name')}
              onBlur={onBeadFieldBlur('name')}
            />
            {beadFormErrors.name ? (
              <span className="a-error">{beadFormErrors.name}</span>
            ) : null}
          </div>
          <div className="a-fg">
            <label className="a-label">Variant (Optional)</label>
            <input
              className="a-input"
              list="bead-variant-options"
              placeholder="e.g. Hand-painted, Original finish"
              value={beadForm.variant || ''}
              onChange={onBeadChange('variant')}
            />
            <datalist id="bead-variant-options">
              <option value="Hand-painted" />
              <option value="Original finish" />
              <option value="Custom color" />
              <option value="Glass" />
              <option value="Clay" />
            </datalist>
          </div>
          <div className="a-fg full">
            <label className="a-label">Description</label>
            <input
              className={beadFormErrors.desc ? 'a-input invalid' : 'a-input'}
              placeholder="Short product description"
              value={beadForm.desc}
              onChange={onBeadChange('desc')}
              onBlur={onBeadFieldBlur('desc')}
            />
            {beadFormErrors.desc ? (
              <span className="a-error">{beadFormErrors.desc}</span>
            ) : null}
          </div>
          <div className="a-fg">
            <label className="a-label">Emoji (Fallback)</label>
            <input
              className="a-input"
              placeholder="📿"
              maxLength={2}
              value={beadForm.emoji}
              onChange={onBeadChange('emoji')}
            />
          </div>
        </div>
        <div className="a-group full">
          <h4 className="a-group-title">Media</h4>
          <div className="a-fg full">
            <label className="a-label">Product Images</label>
            <ImageUploader
              onUpload={(asset) => onAssetUpload(asset, 'beads')}
              resetSignal={beadUploadReset}
              selectedAssets={beadForm.images}
              allowMultiple
            />
          </div>
          <VideoLinksField
            videos={beadForm.videos}
            onChange={onUpdateVideos}
            pendingUrl={beadForm.pendingVideoUrl}
            onPendingUrlChange={onUpdatePendingVideoUrl}
            idPrefix="bead-video"
          />
          {beadForm.videos?.length > 0 &&
          (!beadForm.images || beadForm.images.length === 0) ? (
            <div className="a-hint-box" role="status">
              <Info size={14} className="a-hint-icon" />
              <span>
                <strong>Cover photo recommended:</strong> You've attached a
                TikTok post. Adding a cover photo ensures customers on slow
                networks see an instant preview before playing.
              </span>
            </div>
          ) : null}
        </div>
        <div className="a-group full">
          <h4 className="a-group-title">Pricing & Stock</h4>
          <div className="pricing-toggle">
            <button
              type="button"
              className={`pricing-toggle-btn${beadForm.pricingType === 'fixed' ? ' active' : ''}`}
              onClick={onBeadChange('pricingType')}
              value="fixed"
            >
              Fixed price
            </button>
            <button
              type="button"
              className={`pricing-toggle-btn${beadForm.pricingType === 'range' ? ' active' : ''}`}
              onClick={onBeadChange('pricingType')}
              value="range"
            >
              Price range
            </button>
          </div>
          <div className="a-fg">
            <label className="a-label">
              {beadForm.pricingType === 'range' ? 'Minimum Price' : 'Price'}
            </label>
            <input
              className={beadFormErrors.price ? 'a-input invalid' : 'a-input'}
              placeholder="Kshs 25"
              value={beadForm.priceDisplay}
              onChange={onBeadChange('price')}
              onBlur={onBeadFieldBlur('price')}
            />
            {beadFormErrors.price ? (
              <span className="a-error">{beadFormErrors.price}</span>
            ) : null}
          </div>
          {beadForm.pricingType === 'range' ? (
            <div className="a-fg">
              <label className="a-label">Maximum Price</label>
              <input
                className={beadFormErrors.priceMax ? 'a-input invalid' : 'a-input'}
                placeholder="Kshs 40"
                value={beadForm.priceMaxDisplay}
                onChange={onBeadChange('priceMax')}
                onBlur={onBeadFieldBlur('priceMax')}
              />
              {beadFormErrors.priceMax ? (
                <span className="a-error">{beadFormErrors.priceMax}</span>
              ) : null}
            </div>
          ) : null}
          <div className="a-fg">
            <label className="a-label">Stock Qty</label>
            <input
              className="a-input"
              placeholder="10"
              type="number"
              value={beadForm.stock}
              onChange={onBeadChange('stock')}
            />
          </div>
        </div>
        {beadForm.images?.[0]?.source === 'gallery' && beadForm.images?.[0]?.assetUrl ? (
          <div className="a-fg full">
            <div className="selected-asset-card">
              <img
                src={beadForm.images[0].assetUrl}
                alt={beadForm.images[0].fileName || 'Selected asset'}
              />
              <div className="selected-asset-copy">
                <strong>{beadForm.images[0].fileName || 'Selected gallery asset'}</strong>
                <span>
                  {beadForm.images[0].internalNote || 'This asset will be used when you publish.'}
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => onClearSelectedAsset('beads')}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
        <div className="a-fg full">
          <button className="a-add-btn bead-add" type="submit">
            ＋ Add Bead Product
          </button>
        </div>
      </form>

      <div id="adminBeadList">
        {loadingBeads ? (
          renderSkeletonRows(4, 'beads')
        ) : beadProducts.length ? (
          beadProducts.map((item) => (
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
                {formatPriceRange(item.price, item.priceMax, item.pricingType)} ·{' '}
                {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
              </span>
              <div className="a-row-actions">
                <button
                  className="a-edit"
                  onClick={() => onOpenInventoryEdit('beads', item)}
                  type="button"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="a-del"
                  onClick={() => onDeleteBead(item.id)}
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
            No products added yet.
          </p>
        )}
      </div>
    </AdminPanel>
  )
}
