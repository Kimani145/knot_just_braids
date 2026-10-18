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
import StatsRow from './StatsRow'
import AdminGallery from './AdminGallery'
import SecurityDialog from './SecurityDialog'
import ReminderModal from './ReminderModal'
import UrgentAlerts from './UrgentAlerts'
import AdminHistory from './AdminHistory'
import CatalogLintBanner from './sections/CatalogLintBanner'
import InventoryQuickEditModal from './sections/InventoryQuickEditModal'
import SalonManager from './sections/SalonManager'
import BeadManager from './sections/BeadManager'
import BookingsManager from './sections/BookingsManager'
import OrdersManager from './sections/OrdersManager'
import PhotoPreviewModal from './sections/PhotoPreviewModal'
import formatCurrency from '../../utils/formatCurrency'
import { SkeletonRow } from '../layout/Skeletons'
import { db } from '../../firebase'
import { sendDynamicEmail } from '../../utils/emailService'
import { generateReminderHTML } from '../../utils/emailTemplates'
import {
  BEAD_BACKGROUNDS,
  BEAD_PRODUCTS_COLLECTION,
  BOOKINGS_COLLECTION,
  ORDERS_COLLECTION,
  SALON_BACKGROUNDS,
  SALON_STYLES_COLLECTION,
} from '../../constants/catalog'
import {
  Archive,
  Image,
  Info,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { sanitizeVideos } from '../../utils/tiktok'
import { normalizePriceInput } from '../../utils/pricingUtils'
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
            {theme === 'dark' ? (
              <Sun size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            ) : (
              <Moon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            )}{' '}
            Theme
          </button>
          <button className="a-btn tour-security-btn" onClick={() => setIsSecurityOpen(true)}>
            <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Security
          </button>
          <button className="a-btn tour-walkthrough-btn" onClick={startTour}>
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Walkthrough
          </button>
          <button className="a-btn tour-dashboard-btn" onClick={() => handleToggleViewMode('dashboard')} style={{
            opacity: viewMode === 'dashboard' ? 1 : 0.6,
          }}>
            <LayoutDashboard size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Dashboard
          </button>
          <button className="a-btn tour-history-btn" onClick={() => handleToggleViewMode('history')} style={{
            opacity: viewMode === 'history' ? 1 : 0.6,
          }}>
            <Archive size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> History
          </button>
          <button className="a-btn tour-gallery-btn" onClick={handleToggleMode}>
            {isGallery ? (
              '← Dashboard'
            ) : (
              <>
                <Image size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Asset Gallery
              </>
            )}
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
            <SalonManager
              salonStyles={salonStyles}
              loadingSalon={loadingSalon}
              salonForm={salonForm}
              salonFormErrors={salonFormErrors}
              salonUploadReset={salonUploadReset}
              onSalonChange={handleSalonChange}
              onSalonFieldBlur={handleSalonFieldBlur}
              onAddSalon={handleAddSalon}
              onAssetUpload={handleAssetUpload}
              onOpenInventoryEdit={openInventoryEdit}
              onDeleteSalon={handleDeleteSalon}
              onUpdateVideos={(nextVideos) =>
                setSalonForm((prev) => ({ ...prev, videos: nextVideos }))
              }
              onUpdatePendingVideoUrl={(nextUrl) =>
                setSalonForm((prev) => ({ ...prev, pendingVideoUrl: nextUrl }))
              }
              onClearSelectedAsset={handleClearSelectedAsset}
              getItemAssetUrl={getItemAssetUrl}
              renderSkeletonRows={renderSkeletonRows}
            />

            <BeadManager
              beadProducts={beadProducts}
              loadingBeads={loadingBeads}
              lowStockItems={lowStockItems}
              outOfStockItems={outOfStockItems}
              beadForm={beadForm}
              beadFormErrors={beadFormErrors}
              beadUploadReset={beadUploadReset}
              onBeadChange={handleBeadChange}
              onBeadFieldBlur={handleBeadFieldBlur}
              onAddBead={handleAddBead}
              onAssetUpload={handleAssetUpload}
              onOpenInventoryEdit={openInventoryEdit}
              onDeleteBead={handleDeleteBead}
              onUpdateVideos={(nextVideos) =>
                setBeadForm((prev) => ({ ...prev, videos: nextVideos }))
              }
              onUpdatePendingVideoUrl={(nextUrl) =>
                setBeadForm((prev) => ({ ...prev, pendingVideoUrl: nextUrl }))
              }
              onClearSelectedAsset={handleClearSelectedAsset}
              getItemAssetUrl={getItemAssetUrl}
              renderSkeletonRows={renderSkeletonRows}
            />

            <BookingsManager
              pendingBookings={pendingBookings}
              loadingBookings={loadingBookings}
              onBookingStatus={handleBookingStatus}
              onReminder={handleReminder}
              onPreviewPhoto={setPreviewPhoto}
              renderSkeletonRows={renderSkeletonRows}
            />

            <OrdersManager
              pendingOrders={pendingOrders}
              loadingOrders={loadingOrders}
              onOrderStatus={handleOrderStatus}
              onReminder={handleReminder}
              renderSkeletonRows={renderSkeletonRows}
            />
          </div>
        </>
      )}
      <PhotoPreviewModal
        photoUrl={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />
    </>
  )
}

export default AdminView
