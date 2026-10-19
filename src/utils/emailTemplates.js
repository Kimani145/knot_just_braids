import { BRAND } from '../constants/brand'

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const generateOrderItemsHTML = (lineItems = []) => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return '<p style="margin:0;">Order items will appear here.</p>'
  }

  return lineItems
    .map((item) => {
      const quantity = Math.max(1, Number(item.qty) || 1)
      const unitPrice = Math.max(0, Number(item.price) || 0)
      const safeName = escapeHtml(item.name || 'Product')
      const rawImage = item.imageUrl || item.image || item.assetUrl || ''
      const safeImage =
        typeof rawImage === 'string' && (rawImage.startsWith('https://') || rawImage.startsWith('http://'))
          ? escapeHtml(rawImage)
          : ''

      return `
  <div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
    ${safeImage ? `<img src="${safeImage}" alt="${safeName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;" />` : ''}
    <div>
      <p style="margin: 0; font-weight: bold; color: #1a1a1a;">${safeName}</p>
      <p style="margin: 0; font-size: 0.9em; color: #555;">Qty: ${quantity} | Kshs ${unitPrice * quantity}</p>
    </div>
  </div>`
    })
    .join('')
}

const buildShell = ({ title, intro, body }) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background:${BRAND.colors.bg}; padding:24px; color:${BRAND.colors.text};">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #d6e3d4; border-radius:14px; overflow:hidden;">
    <div style="background:${BRAND.colors.primary}; color:#ffffff; padding:18px 22px;">
      <h2 style="margin:0; font-size:20px;">${escapeHtml(title)}</h2>
      <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">${escapeHtml(BRAND.name)}</p>
    </div>
    <div style="padding:20px 22px;">
      <p style="margin:0 0 14px; font-size:14px; color:${BRAND.colors.text};">${escapeHtml(intro)}</p>
      ${body}
      <p style="margin:16px 0 0; font-size:12px; color:${BRAND.colors.muted};">
        ${escapeHtml(BRAND.signature)}<br/>
        Home-based and mobile braider 📍 ${escapeHtml(BRAND.location)}.
      </p>
    </div>
  </div>
</div>
`

export const generateBookingHTML = (bookingData = {}) => {
  const clientName = escapeHtml(bookingData.clientName || bookingData.client_name || 'Client')
  const styleName = escapeHtml(bookingData.styleName || bookingData.style_name || 'Selected style')
  const date = escapeHtml(bookingData.date || bookingData.appointment_date || 'TBD')
  const time = escapeHtml(bookingData.time || bookingData.appointment_time || 'TBD')
  const phone = escapeHtml(bookingData.phone || bookingData.client_phone || 'Not provided')

  return buildShell({
    title: 'Appointment Request Received',
    intro: `Hi ${clientName}, we have received your appointment request.`,
    body: `
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Style</td><td style="padding:8px 0;"><strong>${styleName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Date</td><td style="padding:8px 0;"><strong>${date}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Time</td><td style="padding:8px 0;"><strong>${time}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Phone</td><td style="padding:8px 0;"><strong>${phone}</strong></td></tr>
      </table>
    `,
  })
}

export const generateOrderHTML = (orderData = {}) => {
  const clientName = escapeHtml(orderData.clientName || orderData.client_name || 'Client')
  const orderId = escapeHtml(orderData.orderId || orderData.order_id || 'Pending ID')
  const total = escapeHtml(orderData.total || orderData.total_amount || 'Kshs 0')
  const address = escapeHtml(orderData.address || orderData.delivery_address || 'Not provided')

  // If lineItems array is supplied, generate safe escaped markup directly
  const safeItemsMarkup = Array.isArray(orderData.lineItems)
    ? generateOrderItemsHTML(orderData.lineItems)
    : String(orderData.itemsHtml || orderData.order_items_html || '<p style="margin:0;">Order items will appear here.</p>')

  return buildShell({
    title: 'Order Confirmation',
    intro: `Hi ${clientName}, your order has been received and is now in our queue.`,
    body: `
      <p style="margin:0 0 12px; font-size:14px;"><strong>Order #${orderId}</strong></p>
      <div style="margin:0 0 12px;">${safeItemsMarkup}</div>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Total</td><td style="padding:8px 0;"><strong>${total}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.colors.muted};">Delivery Address</td><td style="padding:8px 0;"><strong>${address}</strong></td></tr>
      </table>
    `,
  })
}

export const generateReminderHTML = (clientName, appointmentDetails) => {
  const safeName = escapeHtml(clientName || 'there')
  const details = escapeHtml(appointmentDetails || 'your upcoming appointment/order')

  return buildShell({
    title: 'Friendly Reminder',
    intro: `Hi ${safeName}, this is a friendly reminder from ${BRAND.name} regarding ${details}.`,
    body: `
      <p style="margin:0; font-size:14px; line-height:1.6;">
        Please reply to this email or WhatsApp if you need to adjust timing, location, or delivery details.
      </p>
    `,
  })
}

