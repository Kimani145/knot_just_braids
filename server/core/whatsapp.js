import crypto from 'node:crypto'
import { ForbiddenError, UnauthorizedError, ValidationError } from './errors.js'

/**
 * Server Core - WhatsApp Webhook & Payload Utilities
 * Host-agnostic helpers for Meta WhatsApp Cloud API webhooks.
 */

/**
 * Validates Meta webhook challenge request during initial endpoint registration.
 * @param {Record<string, string>} query
 * @param {string} expectedVerifyToken
 * @returns {string} The hub.challenge string if valid
 */
export function verifyWebhookChallenge(query = {}, expectedVerifyToken = '') {
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']

  if (!expectedVerifyToken) {
    throw new ValidationError('Webhook verify token is not configured on server', {
      field: 'verify_token',
    })
  }

  if (mode === 'subscribe' && token === expectedVerifyToken) {
    return challenge || ''
  }

  throw new ForbiddenError('Invalid WhatsApp webhook challenge verification token')
}

/**
 * Validates Meta x-hub-signature-256 header against the raw request body.
 * @param {string|Buffer} rawBody
 * @param {string} signatureHeader e.g. "sha256=abcdef123..."
 * @param {string} appSecret
 * @returns {boolean}
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) {
    throw new UnauthorizedError('Missing webhook signature or application secret')
  }

  const expectedSignature = signatureHeader.replace(/^sha256=/, '')
  const hmac = crypto.createHmac('sha256', appSecret)
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8')
  const digest = hmac.update(bodyBuffer).digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const digestBuffer = Buffer.from(digest, 'hex')

  if (expectedBuffer.length !== digestBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, digestBuffer)
}

/**
 * Parses inbound Meta WhatsApp Cloud API webhook JSON payload.
 * @param {Record<string, any>} body
 * @returns {Array<{ messageId: string, from: string, senderName: string, timestamp: number, type: string, text?: string, image?: { id: string, mimeType: string, sha256: string } }>}
 */
export function parseInboundWhatsAppMessage(body = {}) {
  const entry = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value

  if (!value || !Array.isArray(value.messages) || value.messages.length === 0) {
    return []
  }

  const contactsMap = {}
  if (Array.isArray(value.contacts)) {
    for (const c of value.contacts) {
      if (c.wa_id) {
        contactsMap[c.wa_id] = c.profile?.name || ''
      }
    }
  }

  return value.messages.map((msg) => {
    const from = String(msg.from || '')
    const senderName = contactsMap[from] || ''
    const messageId = String(msg.id || '')
    const timestamp = Number(msg.timestamp) || Math.floor(Date.now() / 1000)
    const type = msg.type || 'unknown'

    const result = {
      messageId,
      from,
      senderName,
      timestamp,
      type,
    }

    if (type === 'text' && msg.text?.body) {
      result.text = String(msg.text.body).trim()
    } else if (type === 'image' && msg.image) {
      result.image = {
        id: String(msg.image.id || ''),
        mimeType: String(msg.image.mime_type || ''),
        sha256: String(msg.image.sha256 || ''),
      }
    }

    return result
  })
}

/**
 * Formats an outbound WhatsApp text message payload for Meta Graph API.
 * @param {string} recipientPhone
 * @param {string} text
 * @returns {Record<string, any>}
 */
export function formatOutboundWhatsAppText(recipientPhone, text) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone.replace(/\D/g, ''),
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  }
}
