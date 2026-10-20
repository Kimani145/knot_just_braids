import { sanitizeVideos } from './tiktok.js'

export const SALON_BACKGROUNDS = ['bg1', 'bg2', 'bg3', 'bg4']
export const BEAD_BACKGROUNDS = ['bg3', 'bg4', 'bg1', 'bg2']

const extractDocData = (docOrData) => {
  if (!docOrData) return { id: '', data: {} }
  if (typeof docOrData.data === 'function') {
    return {
      id: docOrData.id || '',
      data: docOrData.data() || {},
    }
  }
  const { id = '', ...rest } = docOrData
  return { id, data: rest }
}

export const getDisplayName = (data = {}) => {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
  const explicitName = typeof data.name === 'string' ? data.name.trim() : ''
  return explicitName || fullName || ''
}

export const mapSalonStyle = (docOrData, index = 0) => {
  const { id, data } = extractDocData(docOrData)
  const pricingType = data.pricingType === 'range' ? 'range' : 'fixed'
  const minPrice = Number(data.price) || 0
  const maxPrice = pricingType === 'range' ? Number(data.priceMax) || minPrice : null

  return {
    id,
    name: data.name ?? 'Untitled style',
    price: minPrice,
    priceMax: maxPrice,
    pricingType,
    duration: data.duration ?? '—',
    emoji: data.emoji ?? '✨',
    desc: data.description ?? data.desc ?? 'New style',
    bg: data.bg ?? SALON_BACKGROUNDS[index % SALON_BACKGROUNDS.length],
    assetUrl: data.assetUrl ?? '',
    variant: data.variant ? String(data.variant).trim() : '',
    videos: sanitizeVideos(data.videos),
    status: data.status === 'draft' ? 'draft' : 'published',
    internalNote: data.internalNote ? String(data.internalNote).trim() : '',
  }
}

export const mapBeadProduct = (docOrData, index = 0) => {
  const { id, data } = extractDocData(docOrData)
  const pricingType = data.pricingType === 'range' ? 'range' : 'fixed'
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : []
  const coverImage = images[0] ?? data.assetUrl ?? ''
  const minPrice = Number(data.price) || 0
  const maxPrice = pricingType === 'range' ? Number(data.priceMax) || minPrice : null

  return {
    id,
    name: data.name ?? 'Untitled product',
    price: minPrice,
    priceMax: maxPrice,
    pricingType,
    stock: Math.max(0, Number.parseInt(data.stock, 10) || 0),
    emoji: data.emoji ?? '📿',
    desc: data.description ?? data.desc ?? 'New product',
    bg: data.bg ?? BEAD_BACKGROUNDS[index % BEAD_BACKGROUNDS.length],
    images,
    assetUrl: coverImage,
    variant: data.variant ? String(data.variant).trim() : '',
    videos: sanitizeVideos(data.videos),
    status: data.status === 'draft' ? 'draft' : 'published',
    internalNote: data.internalNote ? String(data.internalNote).trim() : '',
  }
}

export const mapBooking = (docOrData) => {
  const { id, data } = extractDocData(docOrData)
  const displayName = getDisplayName(data)

  return {
    id,
    ...data,
    clientName: data.clientName || displayName || 'Unknown',
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    name: displayName || 'Appointment request',
    style: data.style ?? data.service ?? 'Style request',
    date: data.date ?? 'Date pending',
    time: data.time ?? 'Time pending',
    status: data.status ?? 'pending',
  }
}

export const mapOrder = (docOrData) => {
  const { id, data } = extractDocData(docOrData)
  const displayName = getDisplayName(data)
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []
  const itemSummary =
    typeof data.items === 'string' && data.items.trim()
      ? data.items
      : lineItems
          .map((item) => `${item.name ?? 'Item'} x${Number(item.qty) || 0}`)
          .join(', ')

  return {
    id,
    ...data,
    clientName: data.clientName || displayName || 'Unknown',
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    name: displayName || 'Order customer',
    items: itemSummary || 'Order details pending',
    total: Number(data.total) || 0,
    status: data.status ?? 'pending',
  }
}
