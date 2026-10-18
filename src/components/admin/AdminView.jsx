import { useMemo, useState } from 'react'
import { Joyride, STATUS } from 'react-joyride'
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
import ReminderModal from './ReminderModal'
import UrgentAlerts from './UrgentAlerts'
import AdminHistory from './AdminHistory'
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
import { AlertTriangle, Video } from 'lucide-react'
import VideoLinksField from './VideoLinksField'
import { sanitizeVideos } from '../../utils/tiktok'
import { formatPriceRange, normalizePriceInput } from '../../utils/pricingUtils'
import { lintAllCatalogs } from '../../utils/catalogLint'

const initialSalonForm = {
  name: '',
  pricingType: 'fixed',
  price: '',
  priceMax: '',
  priceDisplay: '',
  priceMaxDisplay: '',
  duration: '',
  emoji: '',
  desc: '',
  variant: '',
  image: null,
  videos: [],
  pendingVideoUrl: '',
}

const initialBeadForm = {
  name: '',
  pricingType: 'fixed',
  price: '',
  priceMax: '',
  priceDisplay: '',
  priceMaxDisplay: '',
  stock: '',
  emoji: '',
  desc: '',
  variant: '',
  images: [],
  videos: [],
  pendingVideoUrl: '',
}

const initialInventoryEditForm = {
  id: '',
  type: 'salon',
  name: '',
  pricingType: 'fixed',
  price: '',
  priceMax: '',
  priceDisplay: '',
  priceMaxDisplay: '',
  duration: '',
  stock: '',
  desc: '',
  variant: '',
  image: null,
  images: [],
  videos: [],
  initialVideos: [],
  pendingVideoUrl: '',
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

function CatalogLintBanner({ warnings = [] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  if (!warnings.length) return null

  return (
    <div className="catalog-lint-banner" role="region" aria-label="Catalog Health Issues">
      <div className="catalog-lint-header" onClick={() => setIsExpanded((prev) => !prev)}>
        <div className="catalog-lint-title">
          <AlertTriangle size={18} className="catalog-lint-icon" />
          <span>
            <strong>Catalog Health:</strong> {warnings.length} {warnings.length === 1 ? 'issue' : 'issues'} detected
          </span>
        </div>
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
      {isExpanded ? (
        <ul className="catalog-lint-list">
          {warnings.map((warn) => (
            <li key={warn.id} className="catalog-lint-item">
              <span className={`catalog-lint-tag tag-${warn.catalogType}`}>
                {warn.catalogType === 'salon' ? 'SALON' : 'BEADS'}
              </span>
              <span className="catalog-lint-msg">{warn.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function InventoryQuickEditModal({
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

const tourSteps = [
  // --- TOP NAVIGATION ---
  {
    target: '.tour-walkthrough-btn',
    content: 'You can restart this tutorial at any time by clicking here.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.tour-theme-btn',
    content: 'Switch between light and dark mode depending on your environment.',
    placement: 'bottom',
  },
  {
    target: '.tour-security-btn',
    content: 'Click here to update your admin password. Keep this secure!',
    placement: 'bottom',
  },
  {
    target: '.tour-dashboard-btn',
    content: 'Switch to the main dashboard view to manage active salon bookings and orders.',
    placement: 'bottom',
  },
  {
    target: '.tour-history-btn',
    content: 'Need to find an old receipt? Click here to view your immutable history of completed bookings and orders.',
    placement: 'bottom',
  },
  {
    target: '.tour-gallery-btn',
    content: 'Need to see all uploaded photos? This opens your full Asset Gallery.',
    placement: 'bottom',
  },
  {
    target: '.tour-exit-btn',
    content: 'When you are done, click here to safely log out and return to the public site.',
    placement: 'left',
  },

  // --- ADDING INVENTORY ---
  {
    target: '.tour-add-hair-form',
    content: 'To add a new salon service, fill out the Style Name, Duration, and Price here. Upload an image, and click "Add Hair Style" to push it live.',
    placement: 'right',
  },
  {
    target: '.tour-add-bead-form',
    content: 'For the physical shop, enter the Product Name, Price, and current Stock Qty. If stock hits 0, the site will automatically mark it as "Out of Stock".',
    placement: 'left',
  },

  // --- PROCESSING REQUESTS ---
  {
    target: '.tour-appointments-panel',
    content: 'This panel shows clients waiting for a salon confirmation.',
    placement: 'top',
  },
  {
    target: '.tour-appointments-actions',
    content: 'Use "Confirm" to lock in the appointment, "Decline" to cancel it, or "Remind" to send them a quick WhatsApp/Email message.',
    placement: 'bottom',
  },
  {
    target: '.tour-orders-panel',
    content: 'This panel tracks physical beadwork orders that have been paid for.',
    placement: 'top',
  },
  {
    target: '.tour-orders-actions',
    content: 'Once you have packaged the beads and handed them to the rider, click "Mark Fulfilled" to archive the order and send a final receipt to the client.',
    placement: 'bottom',
  }
]

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
  const [runTour, setRunTour] = useState(false)
  const [tourKey, setTourKey] = useState(0)

  const handleJoyrideCallback = (data) => {
    const { status } = data
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED]
    if (finishedStatuses.includes(status)) {
      setRunTour(false)
    }
  }

  const startTour = () => {
    setViewMode('dashboard')
    setAdminMode('dashboard')
    setTourKey((prev) => prev + 1)
    setTimeout(() => {
      setRunTour(true)
    }, 100)
  }
  const [salonFormErrors, setSalonFormErrors] = useState({
    name: '',
    price: '',
    priceMax: '',
    desc: '',
  })
  const [beadForm, setBeadForm] = useState(initialBeadForm)
  const [beadFormErrors, setBeadFormErrors] = useState({
    name: '',
    price: '',
    priceMax: '',
    desc: '',
  })
  const [salonUploadReset, setSalonUploadReset] = useState(0)
  const [beadUploadReset, setBeadUploadReset] = useState(0)
  const [isSecurityOpen, setIsSecurityOpen] = useState(false)
  const [dashboardFeedback, setDashboardFeedback] = useState(null)
  const [inventoryEditForm, setInventoryEditForm] = useState(initialInventoryEditForm)
  const [inventoryEditFeedback, setInventoryEditFeedback] = useState(null)
  const [isSavingInventoryEdit, setIsSavingInventoryEdit] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [currentReminderItem, setCurrentReminderItem] = useState(null)
  const [currentReminderType, setCurrentReminderType] = useState(null)
  const [viewMode, setViewMode] = useState('dashboard')
  const [previewPhoto, setPreviewPhoto] = useState(null)

  // Filter to show only pending items in dashboard
  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings],
  )

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'pending'),
    [orders],
  )

  const pendingCount = useMemo(
    () => pendingBookings.length + pendingOrders.length,
    [pendingBookings, pendingOrders],
  )

  const lowStockItems = useMemo(
    () => beadProducts.filter((product) => product.stock > 0 && product.stock < 3),
    [beadProducts],
  )

  const outOfStockItems = useMemo(
    () => beadProducts.filter((product) => product.stock === 0),
    [beadProducts],
  )

  const catalogWarnings = useMemo(
    () => lintAllCatalogs(salonStyles, beadProducts),
    [salonStyles, beadProducts],
  )

  const isGallery = adminMode === 'gallery'
  const isHistory = viewMode === 'history'

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

  const handleToggleViewMode = (mode) => {
    setViewMode(mode)
    setAdminMode('dashboard')
  }

  const handleOpenReminder = (item, type) => {
    setCurrentReminderItem({
      ...item,
      clientName: item.clientName || item.name || 'Unknown',
      clientEmail: item.clientEmail || null,
      clientPhone: item.clientPhone || null,
    })
    setCurrentReminderType(type)
    setIsReminderOpen(true)
  }

  const handleCloseReminder = () => {
    setIsReminderOpen(false)
    setCurrentReminderItem(null)
    setCurrentReminderType(null)
  }

  const handleSendReminderWhatsApp = async () => {
    if (!currentReminderItem) return

    const phone = normalizeWhatsappPhone(currentReminderItem.clientPhone)
    if (!phone) {
      pushDashboardFeedback('error', 'No phone number available for this client.')
      handleCloseReminder()
      return
    }

    const clientName = currentReminderItem.clientName || currentReminderItem.name || 'there'
    const appointmentDetails =
      currentReminderType === 'booking'
        ? `${currentReminderItem.style || 'your style'} on ${currentReminderItem.date || 'your date'} at ${currentReminderItem.time || 'your time'}`
        : `your order ${currentReminderItem.id ? `#${currentReminderItem.id}` : ''} (${currentReminderItem.items || 'order details'})`

    const message = `Hi ${clientName}, this is a friendly reminder from Knot Just regarding your upcoming ${
      currentReminderType === 'booking' ? 'appointment' : 'order'
    }. ${appointmentDetails}.`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    pushDashboardFeedback('success', 'WhatsApp reminder opened in a new tab.')
    handleCloseReminder()
  }

  const handleSendReminderEmail = async () => {
    if (!currentReminderItem) return

    if (!currentReminderItem.clientEmail) {
      pushDashboardFeedback('error', 'No email address available for this client.')
      handleCloseReminder()
      return
    }

    try {
      const clientName = currentReminderItem.clientName || currentReminderItem.name || 'there'
      const appointmentDetails =
        currentReminderType === 'booking'
          ? `${currentReminderItem.style || 'your style'} on ${currentReminderItem.date || 'your date'} at ${currentReminderItem.time || 'your time'}`
          : `your order ${currentReminderItem.id ? `#${currentReminderItem.id}` : ''} (${currentReminderItem.items || 'order details'})`

      await sendDynamicEmail({
        to_email: currentReminderItem.clientEmail,
        to_name: clientName,
        subject:
          currentReminderType === 'booking'
            ? 'Appointment Reminder from Knot Just'
            : 'Order Reminder from Knot Just',
        html_content: generateReminderHTML(clientName, appointmentDetails),
      })
      pushDashboardFeedback('success', 'Reminder email sent successfully.')
      handleCloseReminder()
    } catch (error) {
      console.error('Failed to send reminder email:', error)
      pushDashboardFeedback('error', 'Unable to send reminder email right now.')
    }
  }

  const validateSalonField = (field, formState = salonForm) => {
    const pricingType = formState.pricingType === 'range' ? 'range' : 'fixed'
    const priceValue = Number(formState.price)
    const priceMaxValue = Number(formState.priceMax)

    if (field === 'name' && !formState.name.trim()) {
      return 'Style name is required.'
    }
    if (field === 'desc' && !formState.desc.trim()) {
      return 'Description is required.'
    }
    if (field === 'price') {
      if (!priceValue || priceValue <= 0) return 'Enter a valid minimum price.'
      if (pricingType === 'range' && priceMaxValue <= priceValue) {
        return 'Minimum price must be lower than maximum price.'
      }
    }
    if (field === 'priceMax' && pricingType === 'range') {
      if (!priceMaxValue || priceMaxValue <= 0) return 'Enter a valid maximum price.'
      if (priceMaxValue <= priceValue) return 'Maximum price must be greater than minimum price.'
    }
    return ''
  }

  const handleSalonFieldBlur = (field) => () => {
    setSalonFormErrors((prev) => ({
      ...prev,
      [field]: validateSalonField(field),
    }))
  }

  const handleSalonChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price' || field === 'priceMax') {
      const normalized = normalizePriceInput(value)
      setSalonForm((prev) => ({
        ...prev,
        [field]: normalized.raw,
        [field === 'price' ? 'priceDisplay' : 'priceMaxDisplay']: normalized.display,
      }))
      setSalonFormErrors((prev) => ({ ...prev, [field]: '' }))
      return
    }

    if (field === 'pricingType') {
      setSalonForm((prev) => ({
        ...prev,
        pricingType: value === 'range' ? 'range' : 'fixed',
        priceMax:
          value === 'range' ? prev.priceMax : '',
        priceMaxDisplay:
          value === 'range' ? prev.priceMaxDisplay : '',
      }))
      setSalonFormErrors((prev) => ({ ...prev, price: '', priceMax: '' }))
      return
    }

    if (field === 'name' || field === 'desc') {
      setSalonFormErrors((prev) => ({ ...prev, [field]: '' }))
    }

    setSalonForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleBeadChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price' || field === 'priceMax') {
      const normalized = normalizePriceInput(value)
      setBeadForm((prev) => ({
        ...prev,
        [field]: normalized.raw,
        [field === 'price' ? 'priceDisplay' : 'priceMaxDisplay']: normalized.display,
      }))
      setBeadFormErrors((prev) => ({ ...prev, [field]: '' }))
      return
    }

    if (field === 'pricingType') {
      setBeadForm((prev) => ({
        ...prev,
        pricingType: value === 'range' ? 'range' : 'fixed',
        priceMax:
          value === 'range' ? prev.priceMax : '',
        priceMaxDisplay:
          value === 'range' ? prev.priceMaxDisplay : '',
      }))
      setBeadFormErrors((prev) => ({ ...prev, price: '', priceMax: '' }))
      return
    }

    if (field === 'name' || field === 'desc') {
      setBeadFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
    setBeadForm((prev) => ({ ...prev, [field]: value }))
  }

  const validateBeadField = (field, formState = beadForm) => {
    const pricingType = formState.pricingType === 'range' ? 'range' : 'fixed'
    const priceValue = Number(formState.price)
    const priceMaxValue = Number(formState.priceMax)

    if (field === 'name' && !formState.name.trim()) {
      return 'Product name is required.'
    }
    if (field === 'desc' && !formState.desc.trim()) {
      return 'Description is required.'
    }
    if (field === 'price') {
      if (!priceValue || priceValue <= 0) return 'Enter a valid minimum price.'
      if (pricingType === 'range' && priceMaxValue <= priceValue) {
        return 'Minimum price must be lower than maximum price.'
      }
    }
    if (field === 'priceMax' && pricingType === 'range') {
      if (!priceMaxValue || priceMaxValue <= 0) return 'Enter a valid maximum price.'
      if (priceMaxValue <= priceValue) return 'Maximum price must be greater than minimum price.'
    }
    return ''
  }

  const handleBeadFieldBlur = (field) => () => {
    setBeadFormErrors((prev) => ({
      ...prev,
      [field]: validateBeadField(field),
    }))
  }

  const handleInventoryEditChange = (field) => (event) => {
    const { value } = event.target
    if (field === 'price' || field === 'priceMax') {
      const normalized = normalizePriceInput(value)
      setInventoryEditForm((prev) => ({
        ...prev,
        [field]: normalized.raw,
        [field === 'price' ? 'priceDisplay' : 'priceMaxDisplay']: normalized.display,
      }))
      return
    }

    if (field === 'pricingType') {
      setInventoryEditForm((prev) => ({
        ...prev,
        pricingType: value === 'range' ? 'range' : 'fixed',
        priceMax: value === 'range' ? prev.priceMax : '',
        priceMaxDisplay: value === 'range' ? prev.priceMaxDisplay : '',
      }))
      return
    }

    setInventoryEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleInventoryEditAssetUpload = (asset, formType) => {
    if (formType === 'salon') {
      setInventoryEditForm((prev) => ({
        ...prev,
        image: asset || null,
      }))
      return
    }

    setInventoryEditForm((prev) => ({
      ...prev,
      images: Array.isArray(asset) ? asset : asset ? [asset] : [],
    }))
  }

  const handleAssetUpload = (asset, formType) => {
    if (formType === 'salon') {
      setSalonForm((prev) => ({ ...prev, image: asset || null }))
      return
    }

    setBeadForm((prev) => ({
      ...prev,
      images: Array.isArray(asset) ? asset : asset ? [asset] : [],
    }))
  }

  const getItemAssetUrl = (item) =>
    item.images?.[0] || item.assetUrl || item.image?.assetUrl || item.image?.previewUrl || ''

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
        images: [republishedAsset],
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

    setBeadForm((prev) => ({ ...prev, images: [] }))
  }

  const openInventoryEdit = (type, item) => {
    const itemVideos = sanitizeVideos(item.videos)
    const pricingType = item.pricingType === 'range' ? 'range' : 'fixed'
    const itemImages = Array.isArray(item.images) && item.images.length > 0
      ? item.images.filter(Boolean)
      : item.assetUrl
        ? [item.assetUrl]
        : []
    const normalizedAssets = itemImages.map((url, i) => ({
      id: `existing-asset-${i}`,
      assetUrl: url,
      previewUrl: url,
      fileName: `${item.name} (${i + 1})`,
    }))
    const salonAsset = item.assetUrl
      ? {
          id: 'existing-salon-asset',
          assetUrl: item.assetUrl,
          previewUrl: item.assetUrl,
          fileName: item.name,
        }
      : null

    setInventoryEditForm({
      id: item.id,
      type,
      name: item.name,
      pricingType,
      price: Number(item.price) || 0,
      priceMax: pricingType === 'range' && item.priceMax ? Number(item.priceMax) : '',
      priceDisplay: formatCurrency(item.price),
      priceMaxDisplay: pricingType === 'range' && item.priceMax ? formatCurrency(item.priceMax) : '',
      duration: item.duration ?? '',
      stock: type === 'beads' ? String(item.stock ?? 0) : '',
      desc: item.desc ?? item.description ?? '',
      variant: item.variant ?? '',
      image: salonAsset,
      images: normalizedAssets,
      videos: itemVideos,
      initialVideos: itemVideos,
      pendingVideoUrl: '',
    })
    setInventoryEditFeedback(null)
  }

  const closeInventoryEdit = () => {
    setInventoryEditForm(initialInventoryEditForm)
    setInventoryEditFeedback(null)
  }

  const handleUpdateInventoryItem = async (event) => {
    event.preventDefault()

    if (inventoryEditForm.pendingVideoUrl?.trim()) {
      setInventoryEditFeedback({
        type: 'error',
        message: 'Add or clear the video link before saving.',
      })
      return
    }

    const pricingType = inventoryEditForm.pricingType === 'range' ? 'range' : 'fixed'
    const priceValue = Number(inventoryEditForm.price)
    if (!priceValue || priceValue <= 0) {
      setInventoryEditFeedback({
        type: 'error',
        message: 'Enter a valid price before saving.',
      })
      return
    }

    const priceMaxValue = pricingType === 'range' ? Number(inventoryEditForm.priceMax) : null
    if (pricingType === 'range') {
      if (!priceMaxValue || priceMaxValue <= 0) {
        setInventoryEditFeedback({
          type: 'error',
          message: 'Enter a valid maximum price.',
        })
        return
      }
      if (priceMaxValue <= priceValue) {
        setInventoryEditFeedback({
          type: 'error',
          message: 'Maximum price must be greater than minimum price.',
        })
        return
      }
    }

    setIsSavingInventoryEdit(true)
    setInventoryEditFeedback(null)

    const collectionName =
      inventoryEditForm.type === 'salon'
        ? SALON_STYLES_COLLECTION
        : BEAD_PRODUCTS_COLLECTION

    const payload = {
      pricingType,
      price: priceValue,
      priceMax: pricingType === 'range' ? priceMaxValue : null,
      variant: inventoryEditForm.variant?.trim() || '',
      description:
        inventoryEditForm.desc.trim() ||
        (inventoryEditForm.type === 'salon' ? 'Updated style' : 'Updated product'),
      updatedAt: serverTimestamp(),
    }

    if (inventoryEditForm.type === 'salon') {
      payload.duration = inventoryEditForm.duration.trim() || '—'
      payload.assetUrl = inventoryEditForm.image?.assetUrl || ''
    } else {
      payload.stock = Math.max(0, Number.parseInt(inventoryEditForm.stock, 10) || 0)
      const images = (Array.isArray(inventoryEditForm.images) ? inventoryEditForm.images : [])
        .map((img) => img?.assetUrl || img?.previewUrl || (typeof img === 'string' ? img : ''))
        .filter(Boolean)
      payload.images = images
      payload.assetUrl = images[0] || ''
    }

    const currentVideos = sanitizeVideos(inventoryEditForm.videos)
    const initialVideos = sanitizeVideos(inventoryEditForm.initialVideos)
    if (JSON.stringify(currentVideos) !== JSON.stringify(initialVideos)) {
      payload.videos = currentVideos
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
    if (salonForm.pendingVideoUrl?.trim()) {
      pushDashboardFeedback('error', 'Add or clear the video link before saving.')
      return
    }

    const nextErrors = {
      name: validateSalonField('name'),
      price: validateSalonField('price'),
      priceMax: validateSalonField('priceMax'),
      desc: validateSalonField('desc'),
    }
    setSalonFormErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      pushDashboardFeedback('error', 'Fix the highlighted hair style fields and try again.')
      return
    }

    const pricingType = salonForm.pricingType === 'range' ? 'range' : 'fixed'
    const priceValue = Number(salonForm.price)
    const priceMaxValue = pricingType === 'range' ? Number(salonForm.priceMax) : null
    const bg = SALON_BACKGROUNDS[salonStyles.length % SALON_BACKGROUNDS.length]
    const assetUrl = salonForm.image?.assetUrl || ''
    const emoji = salonForm.emoji.trim() || '✨'
    const videos = sanitizeVideos(salonForm.videos)
    const variant = salonForm.variant?.trim() || ''

    try {
      await addDoc(collection(db, SALON_STYLES_COLLECTION), {
        name: salonForm.name.trim(),
        pricingType,
        price: priceValue,
        priceMax: pricingType === 'range' ? priceMaxValue : null,
        variant,
        duration: salonForm.duration.trim() || '—',
        description: salonForm.desc.trim() || 'New style',
        assetUrl,
        emoji,
        bg,
        videos,
        createdAt: serverTimestamp(),
      })

      setSalonForm(initialSalonForm)
      setSalonFormErrors({
        name: '',
        price: '',
        priceMax: '',
        desc: '',
      })
      setSalonUploadReset((value) => value + 1)
      pushDashboardFeedback('success', 'Hair style published successfully.')
    } catch (error) {
      console.error('Failed to save salon style:', error)
      pushDashboardFeedback('error', 'Could not save the hair style to Firestore.')
    }
  }

  const handleAddBead = async (event) => {
    event.preventDefault()
    if (beadForm.pendingVideoUrl?.trim()) {
      pushDashboardFeedback('error', 'Add or clear the video link before saving.')
      return
    }
    const nextErrors = {
      name: validateBeadField('name'),
      price: validateBeadField('price'),
      priceMax: validateBeadField('priceMax'),
      desc: validateBeadField('desc'),
    }
    setBeadFormErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      pushDashboardFeedback('error', 'Fix the highlighted bead product fields and try again.')
      return
    }

    const pricingType = beadForm.pricingType === 'range' ? 'range' : 'fixed'
    const priceValue = Number(beadForm.price)
    const priceMaxValue = pricingType === 'range' ? Number(beadForm.priceMax) : null
    const bg = BEAD_BACKGROUNDS[beadProducts.length % BEAD_BACKGROUNDS.length]
    const stock = Math.max(0, Number.parseInt(beadForm.stock, 10) || 0)
    const images = (Array.isArray(beadForm.images) ? beadForm.images : [])
      .map((asset) => asset?.assetUrl || asset?.previewUrl || '')
      .filter(Boolean)
    const assetUrl = images[0] ?? ''
    const emoji = beadForm.emoji.trim() || '📿'
    const videos = sanitizeVideos(beadForm.videos)
    const variant = beadForm.variant?.trim() || ''

    try {
      await addDoc(collection(db, BEAD_PRODUCTS_COLLECTION), {
        name: beadForm.name.trim(),
        pricingType,
        price: priceValue,
        priceMax: pricingType === 'range' ? priceMaxValue : null,
        variant,
        stock,
        description: beadForm.desc.trim() || 'New product',
        images,
        assetUrl,
        emoji,
        bg,
        videos,
        createdAt: serverTimestamp(),
      })

      setBeadForm(initialBeadForm)
      setBeadFormErrors({
        name: '',
        price: '',
        priceMax: '',
        desc: '',
      })
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

  // Use modal-based reminder system
  const handleReminder = (item, type) => {
    handleOpenReminder(item, type)
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
      <Joyride
        key={tourKey}
        callback={handleJoyrideCallback}
        continuous={true}
        run={runTour}
        scrollToFirstStep={true}
        showProgress={true}
        showSkipButton={true}
        steps={tourSteps}
        styles={{
          options: {
            arrowColor: '#f8faf8',
            backgroundColor: '#f8faf8',
            overlayColor: 'rgba(0, 0, 0, 0.7)',
            primaryColor: '#2e5a2c', // Your deep brand green
            textColor: '#1a2b1a', // Your dark text color
            zIndex: 1000,
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: '#2e5a2c',
            borderRadius: '6px',
            color: '#ffffff',
          },
          buttonBack: {
            color: '#557a46',
            marginRight: '10px',
          },
          buttonSkip: {
            color: '#1a2b1a',
            fontWeight: '600',
          }
        }}
      />
      <div className="admin-nav">
        <div className="admin-logo">Knot Just — Command Center</div>
        <div className="admin-nav-right">
          <button className="a-btn tour-theme-btn" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'} Theme
          </button>
          <button className="a-btn tour-security-btn" onClick={() => setIsSecurityOpen(true)}>
            🔐 Security
          </button>
          <button className="a-btn tour-walkthrough-btn" onClick={startTour}>
            ℹ️ Walkthrough
          </button>
          <button className="a-btn tour-dashboard-btn" onClick={() => handleToggleViewMode('dashboard')} style={{
            opacity: viewMode === 'dashboard' ? 1 : 0.6,
          }}>
            📊 Dashboard
          </button>
          <button className="a-btn tour-history-btn" onClick={() => handleToggleViewMode('history')} style={{
            opacity: viewMode === 'history' ? 1 : 0.6,
          }}>
            🗄️ History
          </button>
          <button className="a-btn tour-gallery-btn" onClick={handleToggleMode}>
            {isGallery ? '← Dashboard' : '🖼️ Asset Gallery'}
          </button>
          <button className="a-btn danger tour-exit-btn" onClick={onSignOut}>
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
        onAssetUpload={handleInventoryEditAssetUpload}
      />

      <ReminderModal
        isOpen={isReminderOpen}
        item={currentReminderItem}
        type={currentReminderType}
        onSendWhatsApp={handleSendReminderWhatsApp}
        onSendEmail={handleSendReminderEmail}
        onClose={handleCloseReminder}
        clientPhone={currentReminderItem?.clientPhone}
        clientEmail={currentReminderItem?.clientEmail}
      />

      {isGallery ? (
        <AdminGallery
          onRepublishToSalon={(asset) => handleRepublishAsset(asset, 'salon')}
          onRepublishToBeads={(asset) => handleRepublishAsset(asset, 'beads')}
          salonStyles={salonStyles}
          beadProducts={beadProducts}
        />
      ) : isHistory ? (
        <AdminHistory
          bookings={bookings}
          orders={orders}
          loadingBookings={loadingBookings}
          loadingOrders={loadingOrders}
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

          <div
            className="admin-panel span2"
            style={{ background: 'transparent', padding: '0 1.5rem 1rem' }}
          >
            <UrgentAlerts bookings={pendingBookings} orders={pendingOrders} />
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
            <CatalogLintBanner warnings={catalogWarnings} />
            <AdminPanel
              title="Hair Styles Gallery"
              tagLabel="SALON"
              tagClass="tag-salon"
              panelId="admin-salon-panel"
            >
              <form
                className="admin-form tour-add-hair-form"
                style={{ marginBottom: '1rem' }}
                onSubmit={handleAddSalon}
              >
                <div className="a-fg">
                  <label className="a-label">Style Name</label>
                  <input
                    className={salonFormErrors.name ? 'a-input invalid' : 'a-input'}
                    placeholder="Knotless Braids"
                    value={salonForm.name}
                    onChange={handleSalonChange('name')}
                    onBlur={handleSalonFieldBlur('name')}
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
                    onChange={handleSalonChange('variant')}
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
                      onClick={handleSalonChange('pricingType')}
                      value="fixed"
                    >
                      Fixed price
                    </button>
                    <button
                      type="button"
                      className={`pricing-toggle-btn${salonForm.pricingType === 'range' ? ' active' : ''}`}
                      onClick={handleSalonChange('pricingType')}
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
                    onChange={handleSalonChange('price')}
                    onBlur={handleSalonFieldBlur('price')}
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
                      onChange={handleSalonChange('priceMax')}
                      onBlur={handleSalonFieldBlur('priceMax')}
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
                    className={salonFormErrors.desc ? 'a-input invalid' : 'a-input'}
                    placeholder="Short style description"
                    value={salonForm.desc}
                    onChange={handleSalonChange('desc')}
                    onBlur={handleSalonFieldBlur('desc')}
                  />
                  {salonFormErrors.desc ? (
                    <span className="a-error">{salonFormErrors.desc}</span>
                  ) : null}
                </div>
                {salonForm.image?.source === 'gallery' ? (
                  <div className="a-fg full">
                    {renderGallerySelection('salon', salonForm.image)}
                  </div>
                ) : null}
                <VideoLinksField
                  videos={salonForm.videos}
                  onChange={(nextVideos) =>
                    setSalonForm((prev) => ({ ...prev, videos: nextVideos }))
                  }
                  pendingUrl={salonForm.pendingVideoUrl}
                  onPendingUrlChange={(nextUrl) =>
                    setSalonForm((prev) => ({ ...prev, pendingVideoUrl: nextUrl }))
                  }
                  idPrefix="salon-video"
                />
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
                className="admin-form tour-add-bead-form"
                style={{ marginBottom: '1rem' }}
                onSubmit={handleAddBead}
              >
                <div className="a-group full">
                  <h4 className="a-group-title">Basics</h4>
                  <div className="a-fg">
                    <label className="a-label">Product Name</label>
                    <input
                      className={beadFormErrors.name ? 'a-input invalid' : 'a-input'}
                      placeholder="Waist Beads"
                      value={beadForm.name}
                      onChange={handleBeadChange('name')}
                      onBlur={handleBeadFieldBlur('name')}
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
                      onChange={handleBeadChange('variant')}
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
                      onChange={handleBeadChange('desc')}
                      onBlur={handleBeadFieldBlur('desc')}
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
                      onChange={handleBeadChange('emoji')}
                    />
                  </div>
                </div>
                <div className="a-group full">
                  <h4 className="a-group-title">Media</h4>
                  <div className="a-fg full">
                    <label className="a-label">Product Images</label>
                    <ImageUploader
                      onUpload={(asset) => handleAssetUpload(asset, 'beads')}
                      resetSignal={beadUploadReset}
                      selectedAssets={beadForm.images}
                      allowMultiple
                    />
                  </div>
                  <VideoLinksField
                    videos={beadForm.videos}
                    onChange={(nextVideos) =>
                      setBeadForm((prev) => ({ ...prev, videos: nextVideos }))
                    }
                    pendingUrl={beadForm.pendingVideoUrl}
                    onPendingUrlChange={(nextUrl) =>
                      setBeadForm((prev) => ({ ...prev, pendingVideoUrl: nextUrl }))
                    }
                    idPrefix="bead-video"
                  />
                </div>
                <div className="a-group full">
                  <h4 className="a-group-title">Pricing & Stock</h4>
                  <div className="pricing-toggle">
                    <button
                      type="button"
                      className={`pricing-toggle-btn${beadForm.pricingType === 'fixed' ? ' active' : ''}`}
                      onClick={handleBeadChange('pricingType')}
                      value="fixed"
                    >
                      Fixed price
                    </button>
                    <button
                      type="button"
                      className={`pricing-toggle-btn${beadForm.pricingType === 'range' ? ' active' : ''}`}
                      onClick={handleBeadChange('pricingType')}
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
                      onChange={handleBeadChange('price')}
                      onBlur={handleBeadFieldBlur('price')}
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
                        onChange={handleBeadChange('priceMax')}
                        onBlur={handleBeadFieldBlur('priceMax')}
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
                      onChange={handleBeadChange('stock')}
                    />
                  </div>
                </div>
                {beadForm.images?.[0]?.source === 'gallery' ? (
                  <div className="a-fg full">
                    {renderGallerySelection('beads', beadForm.images[0])}
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
              className="tour-appointments-panel"
            >
              <div id="adminBookings" className="tour-appointments-actions">
                {loadingBookings ? (
                  renderSkeletonRows(3, 'bookings')
                ) : pendingBookings.length ? (
                  pendingBookings.map((item) => {
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
                        {item.notes && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8, marginTop: '4px' }}>
                            <strong>Notes:</strong> {item.notes}
                          </div>
                        )}
                        {((item.referencePhotoUrls && item.referencePhotoUrls.length > 0) || item.referencePhotoUrl) && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {(item.referencePhotoUrls || [item.referencePhotoUrl]).map((url, i) => url && (
                              <img
                                key={i}
                                src={url}
                                alt="Reference"
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                onClick={() => setPreviewPhoto(url)}
                                title="Click to view reference"
                              />
                            ))}
                          </div>
                        )}
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
              className="tour-orders-panel"
            >
              <div id="adminOrders" className="tour-orders-actions">
                {loadingOrders ? (
                  renderSkeletonRows(3, 'orders')
                ) : pendingOrders.length ? (
                  pendingOrders.map((item) => (
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
      {previewPhoto && (
        <div
          className="overlay open"
          onClick={() => setPreviewPhoto(null)}
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '90%', height: 'auto', maxHeight: '90vh', padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}
          >
            <div className="sheet-header">
              <h2>Reference Photo</h2>
              <button className="close-btn" onClick={() => setPreviewPhoto(null)}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <img
                src={previewPhoto}
                alt="Reference"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
            <a
              href={previewPhoto}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn btn-primary"
              style={{ textAlign: 'center', textDecoration: 'none' }}
            >
              📥 Download / View Full Image
            </a>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminView
