const BRAND = {
  color: '#2e5a2c',
  text: '#102016',
  muted: '#5b6b5b',
  bg: '#f4f8f3',
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildShell = ({ title, intro, body }) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background:${BRAND.bg}; padding:24px; color:${BRAND.text};">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #d6e3d4; border-radius:14px; overflow:hidden;">
    <div style="background:${BRAND.color}; color:#ffffff; padding:18px 22px;">
      <h2 style="margin:0; font-size:20px;">${title}</h2>
      <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">Knot Just</p>
    </div>
    <div style="padding:20px 22px;">
      <p style="margin:0 0 14px; font-size:14px; color:${BRAND.text};">${intro}</p>
      ${body}
      <p style="margin:16px 0 0; font-size:12px; color:${BRAND.muted};">
        Always do you but let me do your hair 🌸<br/>
        Home-based and mobile braider 📍 Kasarani (Available for housecalls).
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
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Style</td><td style="padding:8px 0;"><strong>${styleName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Date</td><td style="padding:8px 0;"><strong>${date}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Time</td><td style="padding:8px 0;"><strong>${time}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Phone</td><td style="padding:8px 0;"><strong>${phone}</strong></td></tr>
      </table>
    `,
  })
}

export const generateOrderHTML = (orderData = {}) => {
  const clientName = escapeHtml(orderData.clientName || orderData.client_name || 'Client')
  const orderId = escapeHtml(orderData.orderId || orderData.order_id || 'Pending ID')
  const total = escapeHtml(orderData.total || orderData.total_amount || 'Kshs 0')
  const address = escapeHtml(orderData.address || orderData.delivery_address || 'Not provided')
  const itemsHtml = String(orderData.itemsHtml || orderData.order_items_html || '')

  return buildShell({
    title: 'Order Confirmation',
    intro: `Hi ${clientName}, your order has been received and is now in our queue.`,
    body: `
      <p style="margin:0 0 12px; font-size:14px;"><strong>Order #${orderId}</strong></p>
      <div style="margin:0 0 12px;">${itemsHtml || '<p style="margin:0;">Order items will appear here.</p>'}</div>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Total</td><td style="padding:8px 0;"><strong>${total}</strong></td></tr>
        <tr><td style="padding:8px 0; color:${BRAND.muted};">Delivery Address</td><td style="padding:8px 0;"><strong>${address}</strong></td></tr>
      </table>
    `,
  })
}

export const generateReminderHTML = (clientName, appointmentDetails) => {
  const safeName = escapeHtml(clientName || 'there')
  const details = escapeHtml(appointmentDetails || 'your upcoming appointment/order')

  return buildShell({
    title: 'Friendly Reminder',
    intro: `Hi ${safeName}, this is a friendly reminder from Knot Just regarding ${details}.`,
    body: `
      <p style="margin:0; font-size:14px; line-height:1.6;">
        Please reply to this email or WhatsApp if you need to adjust timing, location, or delivery details.
      </p>
    `,
  })
}
