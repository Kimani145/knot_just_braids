/**
 * server/core/validators.js
 * Strict input validation and sanitization for orders and bookings.
 * Whitelists allowed fields, validates types, bounds lengths.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { ValidationError } from './errors.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const PHONE_CHARS_REGEX = /^[+\d\s().-]{7,40}$/

/**
 * Validate and clean a customer name.
 * Combines firstName + lastName if clientName is not provided.
 */
export function sanitizeCustomerName(payload) {
  let name = ''
  if (typeof payload.clientName === 'string') {
    name = payload.clientName.trim()
  } else if (typeof payload.name === 'string') {
    name = payload.name.trim()
  } else {
    const first = typeof payload.firstName === 'string' ? payload.firstName.trim() : ''
    const last = typeof payload.lastName === 'string' ? payload.lastName.trim() : ''
    name = [first, last].filter(Boolean).join(' ')
  }

  if (!name) {
    throw new ValidationError('Customer name is required', { field: 'clientName' })
  }
  if (name.length > 120) {
    throw new ValidationError('Customer name must be 120 characters or fewer', { field: 'clientName' })
  }
  return name
}

/**
 * Validate customer email (optional, but if provided must be valid and <= 254 chars).
 */
export function sanitizeEmail(payload) {
  const raw = payload.clientEmail || payload.email
  if (!raw) return ''

  if (typeof raw !== 'string') {
    throw new ValidationError('Email must be a valid text string', { field: 'clientEmail' })
  }

  const email = raw.trim()
  if (email.length > 254) {
    throw new ValidationError('Email address must be 254 characters or fewer', { field: 'clientEmail' })
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError('Please provide a valid email address', { field: 'clientEmail' })
  }
  return email
}

/**
 * Validate customer phone (optional, but if provided must be valid format <= 40 chars).
 */
export function sanitizePhone(payload) {
  const raw = payload.clientPhone || payload.phone
  if (!raw) return ''

  if (typeof raw !== 'string') {
    throw new ValidationError('Phone number must be a valid text string', { field: 'clientPhone' })
  }

  const phone = raw.trim()
  if (phone.length > 40) {
    throw new ValidationError('Phone number must be 40 characters or fewer', { field: 'clientPhone' })
  }
  if (!PHONE_CHARS_REGEX.test(phone)) {
    throw new ValidationError('Phone number contains invalid characters', { field: 'clientPhone' })
  }
  return phone
}

/**
 * Validate checkout order request payload.
 */
export function validateOrderPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new ValidationError('Order payload must be a valid JSON object')
  }

  // Mandatory policy agreement
  if (rawPayload.agreedToPolicy !== true) {
    throw new ValidationError('You must agree to the Booking & Shop Policies before submitting', {
      field: 'agreedToPolicy',
    })
  }

  // Name
  const clientName = sanitizeCustomerName(rawPayload)
  const clientEmail = sanitizeEmail(rawPayload)
  const clientPhone = sanitizePhone(rawPayload)

  // Address
  const rawAddress = rawPayload.address
  if (typeof rawAddress !== 'string' || !rawAddress.trim()) {
    throw new ValidationError('Delivery address is required', { field: 'address' })
  }
  const address = rawAddress.trim()
  if (address.length > 500) {
    throw new ValidationError('Delivery address must be 500 characters or fewer', { field: 'address' })
  }

  // Line Items
  const rawItems = rawPayload.lineItems || rawPayload.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ValidationError('Cart cannot be empty. Please select at least one item.', {
      field: 'lineItems',
    })
  }
  if (rawItems.length > 30) {
    throw new ValidationError('Cart cannot contain more than 30 distinct items.', {
      field: 'lineItems',
    })
  }

  const lineItems = rawItems.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`Cart item at index ${index} is invalid`, { field: `lineItems[${index}]` })
    }

    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id) {
      throw new ValidationError(`Item ID at position ${index + 1} is missing`, {
        field: `lineItems[${index}].id`,
      })
    }

    const quantity = Number.isInteger(item.quantity) ? item.quantity : parseInt(item.quantity, 10)
    if (!quantity || quantity <= 0 || quantity > 50) {
      throw new ValidationError(`Quantity for item "${id}" must be an integer between 1 and 50`, {
        field: `lineItems[${index}].quantity`,
      })
    }

    return {
      id,
      quantity,
    }
  })

  return {
    clientName,
    clientEmail,
    clientPhone,
    address,
    lineItems,
    agreedToPolicy: true,
  }
}

/**
 * Validate booking request payload.
 */
export function validateBookingPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new ValidationError('Booking payload must be a valid JSON object')
  }

  // Policy
  if (rawPayload.agreedToPolicy !== true) {
    throw new ValidationError('You must agree to the Booking & Shop Policies before submitting', {
      field: 'agreedToPolicy',
    })
  }

  const clientName = sanitizeCustomerName(rawPayload)
  const clientEmail = sanitizeEmail(rawPayload)
  const clientPhone = sanitizePhone(rawPayload)

  // Style
  const rawStyle = rawPayload.style
  if (typeof rawStyle !== 'string' || !rawStyle.trim()) {
    throw new ValidationError('Service / hairstyle selection is required', { field: 'style' })
  }
  const style = rawStyle.trim()
  if (style.length > 200) {
    throw new ValidationError('Style name must be 200 characters or fewer', { field: 'style' })
  }

  // Date (YYYY-MM-DD or reasonable date string)
  const rawDate = rawPayload.date
  if (typeof rawDate !== 'string' || !rawDate.trim()) {
    throw new ValidationError('Appointment date is required', { field: 'date' })
  }
  const date = rawDate.trim()
  if (date.length > 40) {
    throw new ValidationError('Date string must be 40 characters or fewer', { field: 'date' })
  }
  if (DATE_REGEX.test(date)) {
    const appointmentDate = new Date(`${date}T00:00:00Z`)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (appointmentDate < today) {
      throw new ValidationError('Appointment date cannot be in the past', { field: 'date' })
    }
  }

  // Time
  const rawTime = rawPayload.time
  if (typeof rawTime !== 'string' || !rawTime.trim()) {
    throw new ValidationError('Appointment time is required', { field: 'time' })
  }
  const time = rawTime.trim()
  if (time.length > 40) {
    throw new ValidationError('Time string must be 40 characters or fewer', { field: 'time' })
  }

  // Optional length
  let length = ''
  if (typeof rawPayload.length === 'string') {
    length = rawPayload.length.trim()
    if (length.length > 100) {
      throw new ValidationError('Hair length description must be 100 characters or fewer', {
        field: 'length',
      })
    }
  }

  // Optional notes
  let notes = ''
  if (typeof rawPayload.notes === 'string') {
    notes = rawPayload.notes.trim()
    if (notes.length > 1000) {
      throw new ValidationError('Booking notes must be 1000 characters or fewer', { field: 'notes' })
    }
  }

  // Optional reference photo URLs
  let referencePhotoUrls = []
  if (Array.isArray(rawPayload.referencePhotoUrls)) {
    if (rawPayload.referencePhotoUrls.length > 10) {
      throw new ValidationError('Cannot submit more than 10 reference photos', {
        field: 'referencePhotoUrls',
      })
    }
    referencePhotoUrls = rawPayload.referencePhotoUrls.map((url, i) => {
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new ValidationError(`Photo URL at index ${i} must be a valid secure HTTPS link`, {
          field: `referencePhotoUrls[${i}]`,
        })
      }
      return url.trim()
    })
  }

  return {
    clientName,
    clientEmail,
    clientPhone,
    style,
    date,
    time,
    ...(length ? { length } : {}),
    ...(notes ? { notes } : {}),
    ...(referencePhotoUrls.length ? { referencePhotoUrls } : {}),
    agreedToPolicy: true,
  }
}
