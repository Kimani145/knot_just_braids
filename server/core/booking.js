/**
 * server/core/booking.js
 * Authoritative salon booking processor.
 * Validates requested appointments, checks style metadata, and records pending booking.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

import { validateBookingPayload } from './validators.js'
import { isPubliclyVisible } from './catalog.js'
import { ValidationError } from './errors.js'
import { logger } from './log.js'

/**
 * Process a salon booking appointment request.
 * @param {import('./store.js').Store} store
 * @param {object} rawPayload
 * @returns {Promise<{ ok: boolean, bookingId: string, booking: object }>}
 */
export async function processBooking(store, rawPayload) {
  // 1. Strict validation
  const validated = validateBookingPayload(rawPayload)

  // 2. Refuse booking for draft salon styles
  if (typeof store.listSalonStyles === 'function') {
    const styles = await store.listSalonStyles()
    const matchedStyle = (styles || []).find(
      (s) =>
        (s.id && (s.id === rawPayload.styleId || s.id === validated.style)) ||
        (s.name && s.name.trim().toLowerCase() === validated.style.trim().toLowerCase())
    )
    if (matchedStyle && !isPubliclyVisible(matchedStyle)) {
      throw new ValidationError(`Style "${validated.style}" is not currently available for booking`, {
        field: 'style',
      })
    }
  }

  // 2. Build booking document strictly matching Firestore rules schema
  const bookingDoc = {
    clientName: validated.clientName,
    ...(validated.clientEmail ? { clientEmail: validated.clientEmail } : {}),
    ...(validated.clientPhone ? { clientPhone: validated.clientPhone } : {}),
    style: validated.style,
    date: validated.date,
    time: validated.time,
    ...(validated.length ? { length: validated.length } : {}),
    ...(validated.notes ? { notes: validated.notes } : {}),
    ...(validated.referencePhotoUrls ? { referencePhotoUrls: validated.referencePhotoUrls } : {}),
    status: 'pending',
    agreedToPolicy: true,
    createdAt: store.now(),
  }

  const createdBooking = await store.createBooking(bookingDoc)

  logger.info('Salon appointment request booked successfully via server core', {
    bookingId: createdBooking.id,
    style: validated.style,
    date: validated.date,
    time: validated.time,
    clientName: validated.clientName,
    clientEmail: validated.clientEmail,
  })

  return {
    ok: true,
    bookingId: createdBooking.id,
    booking: createdBooking,
  }
}
