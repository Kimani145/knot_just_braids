import { useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import AdminPanel from './AdminPanel'
import StatsRow from './StatsRow'
import ImageUploader from './ImageUploader'
import AdminGallery from './AdminGallery'
import SecurityDialog from './SecurityDialog'
import formatCurrency from '../../utils/formatCurrency'
import { SkeletonRow } from '../layout/Skeletons'
import { db } from '../../firebase'
import {
  BEAD_BACKGROUNDS,
  BEAD_PRODUCTS_COLLECTION,
  BOOKINGS_COLLECTION,
  ORDERS_COLLECTION,
  SALON_BACKGROUNDS,
  SALON_STYLES_COLLECTION,
} from '../../constants/catalog'
import { sendDynamicEmail } from '../../utils/emailService'
import { generateReminderHTML } from '../../utils/emailTemplates'

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

const initialInventoryEditForm = {
  id: '',
  type: 'salon',
  name: '',
  price: '',
  priceDisplay: '',
  duration: '',
  stock: '',
  desc: '',
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

const stripFileExtension = (fileName = '') =>
  fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim()

const createGalleryAsset = (asset) => ({
  id: asset.id,
  fileName: asset.fileName ?? 'Gallery asset',
  assetUrl: asset.assetUrl ?? '',
  previewUrl: asset.assetUrl ?? '',
  internalNote: asset.internalNote ?? '',
  source: 'gallery',
})

const normalizeWhatsappPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('0')) {
    return `254${digits.slice(1)}`
  }

  return digits
}

function InventoryQuickEditModal({
  editForm,
  feedback,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}) {
  const isOpen = Boolean(editForm.id)

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`}>
      <div className="sheet quick-edit-sheet">
        <div className="sheet-header">
          <h2>
            {editForm.type === 'salon' ? 'Edit Hair Style' : 'Edit Bead Product'}
          </h2>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {isOpen ? (
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="note">
              Updating <strong>{editForm.name}</strong>
            </div>

            <div className="fg">
              <label>Price</label>
              <input
                type="text"
                value={editForm.priceDisplay}
                onChange={onChange('price')}
                placeholder="Kshs 120"
              />
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

function AdminView({
  theme,
  onToggleTheme,
  onSignOut,
  adminUser,
  adminMode,
  setAdminMode,
  salonStyles,
  beadProducts,
  loadingSalon = false,
  loadingBeads = false,
  loadingBookings = false,
  loadingOrders = false,
  bookings,
  orders,
}) {
  const [salonForm, setSalonForm] = useState(initialSalonForm)
  const [beadForm, setBeadForm] = useState(initialBeadForm)
  const [salonUploadReset, setSalonUploadReset] = useState(0)
  const [beadUploadReset, setBeadUploadReset] = useState(0)
  const [isSecurityOpen, setIsSecurityOpen] = useState(false)
  const [dashboardFeedback, setDashboardFeedback] = useState(null)
  const [inventoryEditForm, setInventoryEditForm] = useState(initialInventoryEditForm)
  const [inventoryEditFeedback, setInventoryEditFeedback] = useState(null)
  const [isSavingInventoryEdit, setIsSavingInventoryEdit] = useState(false)

  const pendingCount = useMemo(() => {
    const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length
    const pendingOrders = orders.filter((order) => order.status === 'pending').length
    return pendingBookings + pendingOrders
  }, [bookings, orders])

  const lowStockItems = useMemo(
    () => beadProducts.filter((product) => product.stock > 0 && product.stock < 3),
    [beadProducts],
  )

  const outOfStockItems = useMemo(
    () => beadProducts.filter((product) => product.stock === 0),
    [beadProducts],
  )

  const isGallery = adminMode === 'gallery'

  const pushDashboardFeedback = (type, message) => {
    setDashboardFeedback({ type, message })
  }

  const jumpToPanel = (panelId) => {
    setAdminMode('dashboard')
    window.setTimeout(() => {
      document.getElementById(panelId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

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

  const handleInventoryEditChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price') {
      const normalized = normalizePriceInput(value)
      setInventoryEditForm((prev) => ({
        ...prev,
        price: normalized.raw,
        priceDisplay: normalized.display,
      }))
      return
    }

    setInventoryEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAssetUpload = (asset, formType) => {
    if (formType === 'salon') {
      setSalonForm((prev) => ({ ...prev, image: asset || null }))
      return
    }

    setBeadForm((prev) => ({ ...prev, image: asset || null }))
  }

  const getItemAssetUrl = (item) =>
    item.assetUrl || item.image?.assetUrl || item.image?.previewUrl || ''

  const renderSkeletonRows = (count = 4, prefix = 'admin') =>
    Array.from({ length: count }, (_, index) => (
      <SkeletonRow key={`${prefix}-${index}`} />
    ))

  const handleRepublishAsset = (asset, target) => {
    const republishedAsset = createGalleryAsset(asset)
    const defaultName = stripFileExtension(asset.fileName) || 'Untitled asset'
    const defaultDescription = asset.internalNote?.trim() || ''

    if (target === 'salon') {
      setSalonUploadReset((value) => value + 1)
      setSalonForm((prev) => ({
        ...prev,
        name: defaultName,
        desc: defaultDescription,
        image: republishedAsset,
        emoji: prev.emoji || '✨',
      }))
      pushDashboardFeedback('success', 'Asset loaded into the Knot Just Braids form.')
      jumpToPanel('admin-salon-panel')
    } else {
      setBeadUploadReset((value) => value + 1)
      setBeadForm((prev) => ({
        ...prev,
        name: defaultName,
        desc: defaultDescription,
        image: republishedAsset,
        emoji: prev.emoji || '📿',
      }))
      pushDashboardFeedback('success', 'Asset loaded into the Knot Just Beads form.')
      jumpToPanel('admin-beads-panel')
    }
  }

  const handleClearSelectedAsset = (formType) => {
    if (formType === 'salon') {
      setSalonForm((prev) => ({ ...prev, image: null }))
      return
    }

    setBeadForm((prev) => ({ ...prev, image: null }))
  }

  const openInventoryEdit = (type, item) => {
    setInventoryEditForm({
      id: item.id,
      type,
      name: item.name,
      price: Number(item.price) || 0,
      priceDisplay: formatCurrency(item.price),
      duration: item.duration ?? '',
      stock: type === 'beads' ? String(item.stock ?? 0) : '',
      desc: item.desc ?? item.description ?? '',
    })
    setInventoryEditFeedback(null)
  }

  const closeInventoryEdit = () => {
    setInventoryEditForm(initialInventoryEditForm)
    setInventoryEditFeedback(null)
  }

  const handleUpdateInventoryItem = async (event) => {
    event.preventDefault()

    const priceValue = Number(inventoryEditForm.price)
    if (!priceValue || priceValue <= 0) {
      setInventoryEditFeedback({
        type: 'error',
        message: 'Enter a valid price before saving.',
      })
      return
    }

    setIsSavingInventoryEdit(true)
    setInventoryEditFeedback(null)

    const collectionName =
      inventoryEditForm.type === 'salon'
        ? SALON_STYLES_COLLECTION
        : BEAD_PRODUCTS_COLLECTION

    const payload = {
      price: priceValue,
      description:
        inventoryEditForm.desc.trim() ||
        (inventoryEditForm.type === 'salon' ? 'Updated style' : 'Updated product'),
      updatedAt: serverTimestamp(),
    }

    if (inventoryEditForm.type === 'salon') {
      payload.duration = inventoryEditForm.duration.trim() || '—'
    } else {
      payload.stock = Math.max(0, Number.parseInt(inventoryEditForm.stock, 10) || 0)
    }

    try {
      await updateDoc(doc(db, collectionName, String(inventoryEditForm.id)), payload)
      closeInventoryEdit()
      pushDashboardFeedback(
        'success',
        inventoryEditForm.type === 'salon'
          ? 'Hair style updated successfully.'
          : 'Bead product updated successfully.',
      )
    } catch (error) {
      console.error('Failed to update inventory item:', error)
      setInventoryEditFeedback({
        type: 'error',
        message: 'Could not save these inventory changes to Firestore.',
      })
    } finally {
      setIsSavingInventoryEdit(false)
    }
  }

  const handleAddSalon = async (event) => {
    event.preventDefault()
    if (!salonForm.name.trim() || !salonForm.price || !salonForm.desc.trim()) {
      pushDashboardFeedback('error', 'Please fill in the name, price, and description.')
      return
    }

    const priceValue = Number(salonForm.price)
    if (!priceValue || priceValue <= 0) {
      pushDashboardFeedback('error', 'Please enter a valid price.')
      return
    }

    const bg = SALON_BACKGROUNDS[salonStyles.length % SALON_BACKGROUNDS.length]
    const assetUrl = salonForm.image?.assetUrl || ''
    const emoji = salonForm.emoji.trim() || '✨'

    try {
      await addDoc(collection(db, SALON_STYLES_COLLECTION), {
        name: salonForm.name.trim(),
        price: priceValue,
        duration: salonForm.duration.trim() || '—',
        description: salonForm.desc.trim() || 'New style',
        assetUrl,
        emoji,
        bg,
        createdAt: serverTimestamp(),
      })

      setSalonForm(initialSalonForm)
      setSalonUploadReset((value) => value + 1)
      pushDashboardFeedback('success', 'Hair style published successfully.')
    } catch (error) {
      console.error('Failed to save salon style:', error)
      pushDashboardFeedback('error', 'Could not save the hair style to Firestore.')
    }
  }

  const handleAddBead = async (event) => {
    event.preventDefault()
    if (!beadForm.name.trim() || !beadForm.price || !beadForm.desc.trim()) {
      pushDashboardFeedback('error', 'Please fill in the name, price, and description.')
      return
    }

    const priceValue = Number(beadForm.price)
    if (!priceValue || priceValue <= 0) {
      pushDashboardFeedback('error', 'Please enter a valid price.')
      return
    }

    const bg = BEAD_BACKGROUNDS[beadProducts.length % BEAD_BACKGROUNDS.length]
    const stock = Math.max(0, Number.parseInt(beadForm.stock, 10) || 0)
    const assetUrl = beadForm.image?.assetUrl || ''
    const emoji = beadForm.emoji.trim() || '📿'

    try {
      await addDoc(collection(db, BEAD_PRODUCTS_COLLECTION), {
        name: beadForm.name.trim(),
        price: priceValue,
        stock,
        description: beadForm.desc.trim() || 'New product',
        assetUrl,
        emoji,
        bg,
        createdAt: serverTimestamp(),
      })

      setBeadForm(initialBeadForm)
      setBeadUploadReset((value) => value + 1)
      pushDashboardFeedback('success', 'Bead product published successfully.')
    } catch (error) {
      console.error('Failed to save bead product:', error)
      pushDashboardFeedback('error', 'Could not save the bead product to Firestore.')
    }
  }

  const handleDeleteSalon = async (id) => {
    try {
      await deleteDoc(doc(db, SALON_STYLES_COLLECTION, String(id)))
      pushDashboardFeedback('success', 'Hair style removed successfully.')
    } catch (error) {
      console.error('Failed to delete salon style:', error)
      pushDashboardFeedback('error', 'Could not delete the hair style from Firestore.')
    }
  }

  const handleDeleteBead = async (id) => {
    try {
      await deleteDoc(doc(db, BEAD_PRODUCTS_COLLECTION, String(id)))
      pushDashboardFeedback('success', 'Bead product removed successfully.')
    } catch (error) {
      console.error('Failed to delete bead product:', error)
      pushDashboardFeedback('error', 'Could not delete the bead product from Firestore.')
    }
  }

  const handleBookingStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, BOOKINGS_COLLECTION, String(id)), { status })
      pushDashboardFeedback('success', 'Booking status updated successfully.')
    } catch (error) {
      console.error('Failed to update booking status:', error)
      pushDashboardFeedback('error', 'Could not update the booking status in Firestore.')
    }
  }

  const handleOrderStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, ORDERS_COLLECTION, String(id)), { status })
      pushDashboardFeedback('success', 'Order status updated successfully.')
    } catch (error) {
      console.error('Failed to update order status:', error)
      pushDashboardFeedback('error', 'Could not update the order status in Firestore.')
    }
  }

  const handleReminder = async (item, type) => {
    const channel = window
      .prompt('Send reminder via "WhatsApp" or "Email"?', 'WhatsApp')
      ?.trim()
      .toLowerCase()

    if (!channel) {
      return
    }

    const clientName = item.name || 'there'
    const appointmentDetails =
      type === 'booking'
        ? `${item.style || 'your style'} on ${item.date || 'your date'} at ${item.time || 'your time'}`
        : `your order ${item.id ? `#${item.id}` : ''} (${item.items || 'order details'})`

    if (channel === 'whatsapp' || channel === 'wa') {
      const phone = normalizeWhatsappPhone(item.phone)
      if (!phone) {
        window.alert('No phone number available for this client.')
        return
      }

      const message = `Hi ${clientName}, this is a friendly reminder from Knot Just regarding your upcoming ${
        type === 'booking' ? 'appointment' : 'order'
      }. ${appointmentDetails}.`

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      pushDashboardFeedback('success', 'WhatsApp reminder opened in a new tab.')
      return
    }

    if (channel === 'email') {
      if (!item.email) {
        window.alert('No email address available for this client.')
        return
      }

      try {
        await sendDynamicEmail({
          to_email: item.email,
          to_name: clientName,
          subject:
            type === 'booking'
              ? 'Appointment Reminder from Knot Just'
              : 'Order Reminder from Knot Just',
          html_content: generateReminderHTML(clientName, appointmentDetails),
        })
        window.alert('Reminder email sent successfully.')
        pushDashboardFeedback('success', 'Reminder email sent successfully.')
      } catch (error) {
        console.error('Failed to send reminder email:', error)
        pushDashboardFeedback('error', 'Unable to send reminder email right now.')
      }

      return
    }

    window.alert('Please type either "WhatsApp" or "Email".')
  }

  const renderGallerySelection = (formType, asset) => {
    if (!asset?.assetUrl || asset.source !== 'gallery') return null

    return (
      <div className="selected-asset-card">
        <img src={asset.assetUrl} alt={asset.fileName || 'Selected asset'} />
        <div className="selected-asset-copy">
          <strong>{asset.fileName || 'Selected gallery asset'}</strong>
          <span>{asset.internalNote || 'This asset will be used when you publish.'}</span>
        </div>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          onClick={() => handleClearSelectedAsset(formType)}
        >
          Clear
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="admin-nav">
        <div className="admin-logo">Knot Just — Command Center</div>
        <div className="admin-nav-right">
          <button className="a-btn" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'} Theme
          </button>
          <button className="a-btn" onClick={() => setIsSecurityOpen(true)}>
            🔐 Security
          </button>
          <button className="a-btn" onClick={handleToggleMode}>
            {isGallery ? '← Dashboard' : '🖼️ Asset Gallery'}
          </button>
          <button className="a-btn danger" onClick={onSignOut}>
            ← Exit Admin
          </button>
        </div>
      </div>

      <SecurityDialog
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        userEmail={adminUser?.email ?? ''}
      />

      <InventoryQuickEditModal
        editForm={inventoryEditForm}
        feedback={inventoryEditFeedback}
        isSaving={isSavingInventoryEdit}
        onChange={handleInventoryEditChange}
        onClose={closeInventoryEdit}
        onSubmit={handleUpdateInventoryItem}
      />

      {isGallery ? (
        <AdminGallery
          onRepublishToSalon={(asset) => handleRepublishAsset(asset, 'salon')}
          onRepublishToBeads={(asset) => handleRepublishAsset(asset, 'beads')}
        />
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

          {dashboardFeedback ? (
            <div
              className="admin-panel span2"
              style={{ background: 'transparent', padding: '0 1.5rem 0.8rem' }}
            >
              <p
                className={`admin-auth-feedback ${
                  dashboardFeedback.type === 'error'
                    ? 'admin-auth-feedback-error'
                    : 'admin-auth-feedback-success'
                }`}
              >
                {dashboardFeedback.message}
              </p>
            </div>
          ) : null}

          <div className="admin-body">
            <AdminPanel
              title="Hair Styles Gallery"
              tagLabel="SALON"
              tagClass="tag-salon"
              panelId="admin-salon-panel"
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
                {salonForm.image?.source === 'gallery' ? (
                  <div className="a-fg full">
                    {renderGallerySelection('salon', salonForm.image)}
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
                      <span className="sub">
                        {formatCurrency(item.price)} · {item.duration}
                      </span>
                      <div className="a-row-actions">
                        <button
                          className="a-edit"
                          onClick={() => openInventoryEdit('salon', item)}
                          type="button"
                          aria-label={`Edit ${item.name}`}
                        >
                          ✎
                        </button>
                        <button
                          className="a-del"
                          onClick={() => handleDeleteSalon(item.id)}
                          type="button"
                          aria-label={`Delete ${item.name}`}
                        >
                          ✕
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
                    selectedAsset={beadForm.image}
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
                {beadForm.image?.source === 'gallery' ? (
                  <div className="a-fg full">
                    {renderGallerySelection('beads', beadForm.image)}
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
                      <span className="sub">
                        {formatCurrency(item.price)} ·{' '}
                        {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
                      </span>
                      <div className="a-row-actions">
                        <button
                          className="a-edit"
                          onClick={() => openInventoryEdit('beads', item)}
                          type="button"
                          aria-label={`Edit ${item.name}`}
                        >
                          ✎
                        </button>
                        <button
                          className="a-del"
                          onClick={() => handleDeleteBead(item.id)}
                          type="button"
                          aria-label={`Delete ${item.name}`}
                        >
                          ✕
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

            <AdminPanel
              title="Appointment Requests"
              tagLabel="BOOKINGS"
              tagClass="tag-bookings"
            >
              <div id="adminBookings">
                {loadingBookings ? (
                  renderSkeletonRows(3, 'bookings')
                ) : bookings.length ? (
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
                              onClick={() => handleBookingStatus(item.id, 'confirmed')}
                            >
                              ✓ Confirm
                            </button>
                            <button
                              className="confirm-btn cb-decline"
                              type="button"
                              onClick={() => handleBookingStatus(item.id, 'declined')}
                            >
                              ✕ Decline
                            </button>
                            <button
                              className="confirm-btn"
                              type="button"
                              onClick={() => handleReminder(item, 'booking')}
                            >
                              🔔 Remind
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No pending actions.
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
                {loadingOrders ? (
                  renderSkeletonRows(3, 'orders')
                ) : orders.length ? (
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
                            onClick={() => handleOrderStatus(item.id, 'fulfilled')}
                          >
                            📦 Mark Fulfilled
                          </button>
                          <button
                            className="confirm-btn"
                            type="button"
                            onClick={() => handleReminder(item, 'order')}
                          >
                            🔔 Remind
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                    No pending actions.
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
