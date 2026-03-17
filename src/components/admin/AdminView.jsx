import { useMemo, useRef, useState } from 'react'
import AdminPanel from './AdminPanel'
import StatsRow from './StatsRow'
import ImageUploader from './ImageUploader'
import AdminGallery from './AdminGallery'
import formatCurrency from '../../utils/formatCurrency'

const salonBgs = ['sg1', 'sg2', 'sg3', 'sg4', 'sg5', 'sg6']
const beadBgs = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6']

const initialSalonForm = {
  name: '',
  price: '',
  priceDisplay: '',
  duration: '',
  emoji: '',
  desc: '',
  image: null,
}

const initialBeadForm = {
  name: '',
  price: '',
  priceDisplay: '',
  stock: '',
  emoji: '',
  desc: '',
  image: null,
}

const normalizePriceInput = (value) => {
  const normalized = String(value).replace(/[^0-9.]/g, '')
  if (!normalized) {
    return { raw: '', display: '' }
  }

  const parsed = Number.parseFloat(normalized)
  if (Number.isNaN(parsed)) {
    return { raw: '', display: '' }
  }

  return { raw: parsed, display: formatCurrency(parsed) }
}

function AdminView({
  theme,
  onToggleTheme,
  onExit,
  adminMode,
  setAdminMode,
  assetLibrary,
  setAssetLibrary,
  salonStyles,
  setSalonStyles,
  beadProducts,
  setBeadProducts,
  bookings,
  setBookings,
  orders,
  setOrders,
}) {
  const [salonForm, setSalonForm] = useState(initialSalonForm)
  const [beadForm, setBeadForm] = useState(initialBeadForm)
  const [salonUploadReset, setSalonUploadReset] = useState(0)
  const [beadUploadReset, setBeadUploadReset] = useState(0)
  const nextSalonId = useRef(
    salonStyles.length
      ? Math.max(...salonStyles.map((item) => item.id)) + 1
      : 1,
  )
  const nextBeadId = useRef(
    beadProducts.length
      ? Math.max(...beadProducts.map((item) => item.id)) + 1
      : 1,
  )

  const pendingCount = useMemo(() => {
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length
    const pendingOrders = orders.filter((o) => o.status === 'pending').length
    return pendingBookings + pendingOrders
  }, [bookings, orders])

  const isGallery = adminMode === 'gallery'

  const handleToggleMode = () => {
    setAdminMode((prev) => (prev === 'gallery' ? 'dashboard' : 'gallery'))
  }

  const handleSalonChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price') {
      const normalized = normalizePriceInput(value)
      setSalonForm((prev) => ({
        ...prev,
        price: normalized.raw,
        priceDisplay: normalized.display,
      }))
      return
    }

    setSalonForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleBeadChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price') {
      const normalized = normalizePriceInput(value)
      setBeadForm((prev) => ({
        ...prev,
        price: normalized.raw,
        priceDisplay: normalized.display,
      }))
      return
    }

    setBeadForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAssetUpload = (asset, formType) => {
    if (asset) {
      setAssetLibrary((prev) => [asset, ...prev])
    }

    if (formType === 'salon') {
      setSalonForm((prev) => ({ ...prev, image: asset || null }))
    } else {
      setBeadForm((prev) => ({ ...prev, image: asset || null }))
    }
  }

  const handleAddSalon = (event) => {
    event.preventDefault()
    if (!salonForm.name.trim() || !salonForm.price || !salonForm.desc.trim()) {
      window.alert('Please fill in the name, price, and description.')
      return
    }

    const priceValue = Number(salonForm.price)
    if (!priceValue || priceValue <= 0) {
      window.alert('Please enter a valid price.')
      return
    }

    const id = nextSalonId.current++
    const bg = salonBgs[(id - 1) % salonBgs.length]
    const assetUrl = salonForm.image?.assetUrl
    const emoji = salonForm.emoji.trim() || '✨'

    setSalonStyles((prev) => [
      ...prev,
      {
        id,
        name: salonForm.name.trim(),
        price: priceValue,
        duration: salonForm.duration.trim() || '—',
        emoji: assetUrl ? undefined : emoji,
        desc: salonForm.desc.trim() || 'New style',
        bg,
        image: assetUrl ? { assetUrl } : null,
      },
    ])
    setSalonForm(initialSalonForm)
    setSalonUploadReset((value) => value + 1)
  }

  const handleAddBead = (event) => {
    event.preventDefault()
    if (!beadForm.name.trim() || !beadForm.price || !beadForm.desc.trim()) {
      window.alert('Please fill in the name, price, and description.')
      return
    }

    const priceValue = Number(beadForm.price)
    if (!priceValue || priceValue <= 0) {
      window.alert('Please enter a valid price.')
      return
    }

    const id = nextBeadId.current++
    const bg = beadBgs[(id - 1) % beadBgs.length]
    const stock = Math.max(0, Number.parseInt(beadForm.stock, 10) || 0)
    const assetUrl = beadForm.image?.assetUrl
    const emoji = beadForm.emoji.trim() || '📿'

    setBeadProducts((prev) => [
      ...prev,
      {
        id,
        name: beadForm.name.trim(),
        price: priceValue,
        stock,
        emoji: assetUrl ? undefined : emoji,
        desc: beadForm.desc.trim() || 'New product',
        bg,
        image: assetUrl ? { assetUrl } : null,
      },
    ])
    setBeadForm(initialBeadForm)
    setBeadUploadReset((value) => value + 1)
  }

  const handleDeleteSalon = (id) => {
    setSalonStyles((prev) => prev.filter((item) => item.id !== id))
  }

  const handleDeleteBead = (id) => {
    setBeadProducts((prev) => prev.filter((item) => item.id !== id))
  }

  const handleBookingStatus = (id, status) => {
    setBookings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )
  }

  const handleOrderStatus = (id, status) => {
    setOrders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )
  }

  return (
    <>
      <div className="admin-nav">
        <div className="admin-logo">GlowBook — Command Center</div>
        <div className="admin-nav-right">
          <button className="a-btn" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'} Theme
          </button>
          <button className="a-btn" onClick={handleToggleMode}>
            {isGallery ? '← Dashboard' : '🖼️ Asset Gallery'}
          </button>
          <button className="a-btn danger" onClick={onExit}>
            ← Exit Admin
          </button>
        </div>
      </div>

      {isGallery ? (
        <AdminGallery assets={assetLibrary} />
      ) : (
        <>
          <div
            className="admin-panel span2"
            style={{ background: 'transparent', padding: '1.2rem 1.5rem 0' }}
          >
            <StatsRow
              stylesCount={salonStyles.length}
              productsCount={beadProducts.length}
              pendingCount={pendingCount}
            />
          </div>

          <div className="admin-body">
            <AdminPanel
              title="Hair Styles Gallery"
              tagLabel="SALON"
              tagClass="tag-salon"
            >
              <form
                className="admin-form"
                style={{ marginBottom: '1rem' }}
                onSubmit={handleAddSalon}
              >
                <div className="a-fg">
                  <label className="a-label">Style Name</label>
                  <input
                    className="a-input"
                    placeholder="Knotless Braids"
                    value={salonForm.name}
                    onChange={handleSalonChange('name')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Price</label>
                  <input
                    className="a-input"
                    placeholder="Kshs 120"
                    value={salonForm.priceDisplay}
                    onChange={handleSalonChange('price')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Duration</label>
                  <input
                    className="a-input"
                    placeholder="5–7 hrs"
                    value={salonForm.duration}
                    onChange={handleSalonChange('duration')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Style Image</label>
                  <ImageUploader
                    onUpload={(asset) => handleAssetUpload(asset, 'salon')}
                    resetSignal={salonUploadReset}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Emoji (Fallback)</label>
                  <input
                    className="a-input"
                    placeholder="🌿"
                    maxLength={2}
                    value={salonForm.emoji}
                    onChange={handleSalonChange('emoji')}
                  />
                </div>
                <div className="a-fg full">
                  <label className="a-label">Description</label>
                  <input
                    className="a-input"
                    placeholder="Short style description"
                    value={salonForm.desc}
                    onChange={handleSalonChange('desc')}
                  />
                </div>
                <div className="a-fg full">
                  <button className="a-add-btn" type="submit">
                    ＋ Add Hair Style
                  </button>
                </div>
              </form>
              <div id="adminSalonList">
                {salonStyles.length ? (
                  salonStyles.map((item) => (
                    <div className="a-item-row" key={item.id}>
                      <span className="emoji">
                        {item.image?.assetUrl || item.image?.previewUrl ? (
                          <img
                            src={item.image.assetUrl || item.image.previewUrl}
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
                      <span className="sub">
                        {formatCurrency(item.price)} · {item.duration}
                      </span>
                      <button
                        className="a-del"
                        onClick={() => handleDeleteSalon(item.id)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No styles added yet.
                  </p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel
              title="Beadwork Products"
              tagLabel="SHOP"
              tagClass="tag-beads"
            >
              <form
                className="admin-form"
                style={{ marginBottom: '1rem' }}
                onSubmit={handleAddBead}
              >
                <div className="a-fg">
                  <label className="a-label">Product Name</label>
                  <input
                    className="a-input"
                    placeholder="Waist Beads"
                    value={beadForm.name}
                    onChange={handleBeadChange('name')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Price</label>
                  <input
                    className="a-input"
                    placeholder="Kshs 25"
                    value={beadForm.priceDisplay}
                    onChange={handleBeadChange('price')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Stock Qty</label>
                  <input
                    className="a-input"
                    placeholder="10"
                    type="number"
                    value={beadForm.stock}
                    onChange={handleBeadChange('stock')}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Product Image</label>
                  <ImageUploader
                    onUpload={(asset) => handleAssetUpload(asset, 'beads')}
                    resetSignal={beadUploadReset}
                  />
                </div>
                <div className="a-fg">
                  <label className="a-label">Emoji (Fallback)</label>
                  <input
                    className="a-input"
                    placeholder="📿"
                    maxLength={2}
                    value={beadForm.emoji}
                    onChange={handleBeadChange('emoji')}
                  />
                </div>
                <div className="a-fg full">
                  <label className="a-label">Description</label>
                  <input
                    className="a-input"
                    placeholder="Short product description"
                    value={beadForm.desc}
                    onChange={handleBeadChange('desc')}
                  />
                </div>
                <div className="a-fg full">
                  <button className="a-add-btn bead-add" type="submit">
                    ＋ Add Bead Product
                  </button>
                </div>
              </form>
              <div id="adminBeadList">
                {beadProducts.length ? (
                  beadProducts.map((item) => (
                    <div className="a-item-row" key={item.id}>
                      <span className="emoji">
                        {item.image?.assetUrl || item.image?.previewUrl ? (
                          <img
                            src={item.image.assetUrl || item.image.previewUrl}
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
                      <span className="sub">
                        {formatCurrency(item.price)} · {item.stock} in stock
                      </span>
                      <button
                        className="a-del"
                        onClick={() => handleDeleteBead(item.id)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No products added yet.
                  </p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel
              title="Appointment Requests"
              tagLabel="BOOKINGS"
              tagClass="tag-bookings"
            >
              <div id="adminBookings">
                {bookings.length ? (
                  bookings.map((item) => {
                    const chipClass =
                      item.status === 'pending'
                        ? 'sc-pending'
                        : item.status === 'confirmed'
                          ? 'sc-confirmed'
                          : 'sc-declined'

                    return (
                      <div className="b-row" key={item.id}>
                        <div className="b-top">
                          <span className="b-name">{item.name}</span>
                          <span className={`status-chip ${chipClass}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="b-sub">
                          {item.style} · {item.date} at {item.time}
                        </div>
                        {item.status === 'pending' ? (
                          <div className="b-actions">
                            <button
                              className="confirm-btn cb-confirm"
                              type="button"
                              onClick={() =>
                                handleBookingStatus(item.id, 'confirmed')
                              }
                            >
                              ✓ Confirm
                            </button>
                            <button
                              className="confirm-btn cb-decline"
                              type="button"
                              onClick={() =>
                                handleBookingStatus(item.id, 'declined')
                              }
                            >
                              ✕ Decline
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No bookings yet.
                  </p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel
              title="Order Fulfillment"
              tagLabel="ORDERS"
              tagClass="tag-orders"
            >
              <div id="adminOrders">
                {orders.length ? (
                  orders.map((item) => (
                    <div className="b-row" key={item.id}>
                      <div className="b-top">
                        <span className="b-name">
                          {item.name}{' '}
                          <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                            #{item.id}
                          </span>
                        </span>
                        <span
                          className={`status-chip ${
                            item.status === 'pending'
                              ? 'sc-pending'
                              : 'sc-fulfilled'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="b-sub">
                        {item.items} · {formatCurrency(item.total)}
                      </div>
                      {item.status === 'pending' ? (
                        <div className="b-actions">
                          <button
                            className="confirm-btn cb-fulfill"
                            type="button"
                            onClick={() =>
                              handleOrderStatus(item.id, 'fulfilled')
                            }
                          >
                            📦 Mark Fulfilled
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No orders yet.
                  </p>
                )}
              </div>
            </AdminPanel>
          </div>
        </>
      )}
    </>
  )
}

export default AdminView
