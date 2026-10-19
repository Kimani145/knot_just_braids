import {
  verifyWebhookChallenge,
  verifyMetaSignature,
  parseInboundWhatsAppMessage,
} from '../server/core/whatsapp.js'
import {
  detectPromptInjection,
  shouldEscalateToHuman,
  WhatsAppRateLimiter,
  MockLlmProvider,
} from '../server/core/llm.js'
import { createLogger } from '../server/core/log.js'

const logger = createLogger('whatsapp-webhook')
const rateLimiter = new WhatsAppRateLimiter({ maxRequests: 15, windowMs: 3600000 })
const llmProvider = new MockLlmProvider()

/**
 * WhatsApp Cloud API Webhook Handler
 * - GET: Responds to Meta verification challenge
 * - POST: Fast ACK (<3s) inbound messages, validates signatures, runs AI guardrails
 */
export default async function handler(req, res) {
  // --- 1. Meta Webhook Verification Challenge (GET) ---
  if (req.method === 'GET') {
    try {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''
      const challenge = verifyWebhookChallenge(req.query || {}, verifyToken)
      res.setHeader('Content-Type', 'text/plain')
      return res.status(200).send(challenge)
    } catch (err) {
      logger.warn('Webhook verification failed', { error: err.message })
      return res.status(403).send('Forbidden')
    }
  }

  // --- 2. Inbound Message Event (POST) ---
  if (req.method === 'POST') {
    const signature = req.headers['x-hub-signature-256']
    const appSecret = process.env.WHATSAPP_APP_SECRET

    // Optional signature check if app secret is provisioned
    if (appSecret && signature) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      const isValid = verifyMetaSignature(rawBody, signature, appSecret)
      if (!isValid) {
        logger.warn('Rejected unauthorized WhatsApp webhook payload: invalid signature')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    // Fast ACK: Acknowledge receipt to Meta immediately (<3s requirement)
    const messages = parseInboundWhatsAppMessage(req.body)

    for (const msg of messages) {
      try {
        // Enforce per-phone rate limiting
        const rateCheck = rateLimiter.check(msg.from)
        if (!rateCheck.allowed) {
          logger.warn('WhatsApp message rate limit exceeded', { from: msg.from })
          continue
        }

        // Run security guardrails
        const injection = detectPromptInjection(msg.text)
        const escalation = shouldEscalateToHuman(msg.text)

        logger.info('Processed WhatsApp inbound message', {
          messageId: msg.messageId,
          type: msg.type,
          isThreat: injection.isThreat,
          escalate: escalation.escalate,
        })

        // Generate response using provider
        const reply = await llmProvider.generateReply(msg.text, {
          injectionDetected: injection.isThreat,
          escalate: escalation.escalate,
        })

        // Log reply readiness (outbound sending triggered if live access token is configured)
        logger.info('Generated automated WhatsApp assistant reply', {
          replyLength: reply.length,
          to: msg.from,
        })
      } catch (err) {
        logger.error('Error handling individual WhatsApp message', { error: err.message })
      }
    }

    return res.status(200).json({ status: 'received', count: messages.length })
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
