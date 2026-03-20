import emailjs from '@emailjs/browser'

// Initialize EmailJS
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)

/**
 * Send a booking confirmation email
 * @param {Object} bookingData - The booking details
 * @param {string} bookingData.client_name - Full name of the client
 * @param {string} bookingData.style_name - Name of the style booked
 * @param {string} bookingData.appointment_date - Date of appointment (YYYY-MM-DD format)
 * @param {string} bookingData.appointment_time - Time of appointment (HH:MM format)
 * @param {string} bookingData.client_phone - Phone number of the client
 * @param {number} [bookingData.price] - Optional appointment price
 */
export const sendBookingEmail = async (bookingData) => {
  try {
    const templateParams = {
      client_name: bookingData.client_name || '',
      style_name: bookingData.style_name || '',
      appointment_date: bookingData.appointment_date || '',
      appointment_time: bookingData.appointment_time || '',
      client_phone: bookingData.client_phone || '',
      price: bookingData.price || '',
    }

    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID,
      templateParams,
    )

    console.log('Booking email sent successfully:', response)
    return response
  } catch (error) {
    console.error('Failed to send booking email:', error)
    throw error
  }
}

/**
 * Send an order confirmation email
 * @param {Object} orderData - The order details
 * @param {string} orderData.client_name - Full name of the client
 * @param {string} orderData.order_items_html - HTML formatted list of items (e.g., <ul><li>Item x1</li></ul>)
 * @param {number} orderData.total_amount - Total order amount
 * @param {string} orderData.delivery_address - Delivery address
 * @param {string} orderData.client_phone - Phone number of the client
 */
export const sendOrderEmail = async (orderData) => {
  try {
    const templateParams = {
      client_name: orderData.client_name || '',
      order_items_html: orderData.order_items_html || '',
      total_amount: orderData.total_amount || '',
      delivery_address: orderData.delivery_address || '',
      client_phone: orderData.client_phone || '',
    }

    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_ORDER_TEMPLATE_ID,
      templateParams,
    )

    console.log('Order email sent successfully:', response)
    return response
  } catch (error) {
    console.error('Failed to send order email:', error)
    throw error
  }
}
