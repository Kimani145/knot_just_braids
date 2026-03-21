import emailjs from '@emailjs/browser'

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/^['\"]|['\"]$/g, '')
}

const emailConfig = {
  publicKey: normalizeEnvValue(import.meta.env.VITE_EMAILJS_PUBLIC_KEY),
  serviceId: normalizeEnvValue(import.meta.env.VITE_EMAILJS_SERVICE_ID),
  masterTemplateId:
    normalizeEnvValue(import.meta.env.VITE_EMAILJS_MASTER_TEMPLATE) ||
    normalizeEnvValue(import.meta.env.VITE_EMAILJS_MASTER_TEMPLATE_ID),
}

let emailJsInitialized = false

const maskValue = (value) => {
  if (!value) {
    return '(missing)'
  }

  if (value.length <= 8) {
    return `${value[0]}***${value[value.length - 1]}`
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

const validateEmailConfig = () => {
  const requiredFields = [
    ['publicKey', emailConfig.publicKey],
    ['serviceId', emailConfig.serviceId],
    ['masterTemplateId', emailConfig.masterTemplateId],
  ]
  const missing = requiredFields.filter(([, value]) => !value).map(([name]) => name)

  if (missing.length) {
    console.error(`[emailService] Missing EmailJS config: ${missing.join(', ')}`)
    return false
  }

  return true
}

const initEmailJs = () => {
  if (emailJsInitialized) {
    return
  }

  if (!emailConfig.publicKey) {
    console.error('[emailService] EmailJS init skipped: VITE_EMAILJS_PUBLIC_KEY is missing')
    return
  }

  emailjs.init({ publicKey: emailConfig.publicKey })
  emailJsInitialized = true
  console.info('[emailService] EmailJS initialized', {
    publicKey: maskValue(emailConfig.publicKey),
    serviceId: maskValue(emailConfig.serviceId),
    masterTemplateId: maskValue(emailConfig.masterTemplateId),
  })
}

initEmailJs()

export const sendDynamicEmail = async ({
  to_email,
  to_name,
  subject,
  html_content,
}) => {
  const canSend = validateEmailConfig()
  if (!canSend) {
    throw new Error('EmailJS config is incomplete')
  }

  initEmailJs()

  const recipientEmail = String(to_email || '').trim()
  if (!recipientEmail) {
    throw new Error('Email recipient is missing')
  }

  const templateParams = {
    to_email: recipientEmail,
    to_name: String(to_name || '').trim() || 'Client',
    subject: String(subject || '').trim() || 'Knot Just Update',
    html_content: String(html_content || ''),
  }

  try {
    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.masterTemplateId,
      templateParams,
    )

    console.info('[emailService] Dynamic email sent successfully', {
      status: response?.status,
      text: response?.text,
      recipientEmail: maskValue(recipientEmail),
      templateId: maskValue(emailConfig.masterTemplateId),
    })

    return response
  } catch (error) {
    console.error('[emailService] Failed to send dynamic email', {
      message: error?.message,
      status: error?.status,
      text: error?.text,
      serviceId: maskValue(emailConfig.serviceId),
      templateId: maskValue(emailConfig.masterTemplateId),
    })
    throw error
  }
}
