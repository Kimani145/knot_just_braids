import React, { useState } from 'react'
import { Info, Pencil, Trash2, Video } from 'lucide-react'
import AdminPanel from '../AdminPanel'
import ImageUploader from '../ImageUploader'
import VideoLinksField from '../VideoLinksField'
import { formatPriceRange } from '../../../utils/pricingUtils'
import formatCurrency from '../../../utils/formatCurrency'

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
  const [statusFilter, setStatusFilter] = useState('all')

  const publishedCount = beadProducts.filter((p) => p.status !== 'draft').length
  const draftCount = beadProducts.filter((p) => p.status === 'draft').length

  const filteredProducts = beadProducts.filter((p) => {
    if (statusFilter === 'published') return p.status !== 'draft'
    if (statusFilter === 'draft') return p.status === 'draft'
    return true
  })

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
          <div className="a-fg full">
            <label className="a-label">Publish Status</label>
            <div className="pricing-toggle">
              <button
                type="button"
                className={`pricing-toggle-btn${beadForm.status !== 'draft' ? ' active' : ''}`}
                onClick={onBeadChange('status')}
                value="published"
              >
                Published (Customer-Visible)
              </button>
              <button
                type="button"
                className={`pricing-toggle-btn${beadForm.status === 'draft' ? ' active' : ''}`}
                onClick={onBeadChange('status')}
                value="draft"
              >
                Draft (Hidden)
              </button>
            </div>
          </div>
          <div className="a-fg">
            <label className="a-label" htmlFor="bead-name-input">Product Name</label>
            <input
              id="bead-name-input"
              name="name"
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
            <label className="a-label" htmlFor="bead-variant-input">Variant (Optional)</label>
            <input
              id="bead-variant-input"
              name="variant"
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
            <label className="a-label" htmlFor="bead-desc-input">Description</label>
            <input
              id="bead-desc-input"
              name="description"
              className={beadFormErrors.desc ? 'a-input invalid' : 'a-input'}
              placeholder="Short product description (required for published products)"
              value={beadForm.desc}
              onChange={onBeadChange('desc')}
              onBlur={onBeadFieldBlur('desc')}
            />
            {beadFormErrors.desc ? (
              <span className="a-error">{beadFormErrors.desc}</span>
            ) : null}
          </div>
          <div className="a-fg full">
            <label className="a-label" htmlFor="bead-internal-note-input">Internal Note (Admin Only)</label>
            <textarea
              id="bead-internal-note-input"
              name="internalNote"
              className="a-input"
              placeholder="Private procurement notes, supplier links, or stock locations"
              value={beadForm.internalNote || ''}
              onChange={onBeadChange('internalNote')}
              rows={2}
            />
          </div>
          <div className="a-fg">
            <label className="a-label" htmlFor="bead-emoji-input">Emoji (Fallback)</label>
            <input
              id="bead-emoji-input"
              name="emoji"
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
            <label className="a-label" htmlFor="bead-price-input">
              {beadForm.pricingType === 'range' ? 'Minimum Price (KSh)' : 'Price (KSh)'}
            </label>
            <input
              id="bead-price-input"
              name="price"
              type="text"
              inputMode="numeric"
              className={beadFormErrors.price ? 'a-input invalid' : 'a-input'}
              placeholder="e.g. 25"
              value={beadForm.price}
              onChange={onBeadChange('price')}
              onBlur={onBeadFieldBlur('price')}
            />
            {beadForm.price ? (
              <span className="a-hint" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                Preview: {formatCurrency(beadForm.price)}
              </span>
            ) : null}
            {beadFormErrors.price ? (
              <span className="a-error">{beadFormErrors.price}</span>
            ) : null}
          </div>
          {beadForm.pricingType === 'range' ? (
            <div className="a-fg">
              <label className="a-label" htmlFor="bead-price-max-input">Maximum Price (KSh)</label>
              <input
                id="bead-price-max-input"
                name="priceMax"
                type="text"
                inputMode="numeric"
                className={beadFormErrors.priceMax ? 'a-input invalid' : 'a-input'}
                placeholder="e.g. 40"
                value={beadForm.priceMax}
                onChange={onBeadChange('priceMax')}
                onBlur={onBeadFieldBlur('priceMax')}
              />
              {beadForm.priceMax ? (
                <span className="a-hint" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                  Preview: {formatCurrency(beadForm.priceMax)}
                </span>
              ) : null}
              {beadFormErrors.priceMax ? (
                <span className="a-error">{beadFormErrors.priceMax}</span>
              ) : null}
            </div>
          ) : null}
          <div className="a-fg">
            <label className="a-label" htmlFor="bead-stock-input">Stock Qty</label>
            <input
              id="bead-stock-input"
              name="stock"
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
        <div className="a-fg full" style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="a-add-btn bead-add" type="submit" style={{ flex: 1 }}>
            {beadForm.status === 'draft' ? '＋ Save as Draft' : '＋ Add Bead Product'}
          </button>
          {beadForm.status !== 'draft' ? (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              onClick={(e) => {
                onBeadChange('status')({ target: { value: 'draft' } })
                setTimeout(() => {
                  const form = e.target.closest('form')
                  if (form) form.requestSubmit()
                }, 0)
              }}
            >
              Save as Draft
            </button>
          ) : null}
        </div>
      </form>

      <div className="a-filter-tabs">
        <button
          type="button"
          className={`a-filter-tab${statusFilter === 'all' ? ' active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({beadProducts.length})
        </button>
        <button
          type="button"
          className={`a-filter-tab${statusFilter === 'published' ? ' active' : ''}`}
          onClick={() => setStatusFilter('published')}
        >
          Published ({publishedCount})
        </button>
        <button
          type="button"
          className={`a-filter-tab${statusFilter === 'draft' ? ' active' : ''}`}
          onClick={() => setStatusFilter('draft')}
        >
          Drafts ({draftCount})
        </button>
      </div>

      <div id="adminBeadList">
        {loadingBeads ? (
          renderSkeletonRows(4, 'beads')
        ) : filteredProducts.length ? (
          filteredProducts.map((item) => (
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
              {item.status === 'draft' ? (
                <span className="a-draft-badge" title="Draft (not visible to customers)">
                  Draft
                </span>
              ) : null}
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
            {statusFilter === 'all'
              ? 'No products added yet.'
              : `No ${statusFilter} products found.`}
          </p>
        )}
      </div>
    </AdminPanel>
  )
}
