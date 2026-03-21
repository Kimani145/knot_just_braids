import './UrgentAlerts.css'

/**
 * UrgentAlerts - Banner component for 24-hour alert system
 * Displays pending bookings/orders due within the next 24 hours
 */
function UrgentAlerts({ bookings, orders }) {
  const now = new Date()
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Filter pending items due within 24 hours
  const urgentBookings = bookings.filter((booking) => {
    if (booking.status !== 'pending') return false

    // Parse date - assuming ISO format or "YYYY-MM-DD"
    const bookingDate = new Date(booking.date)
    return bookingDate >= now && bookingDate <= twentyFourHoursLater
  })

  const urgentOrders = orders.filter((order) => {
    if (order.status !== 'pending') return false

    // Parse date - assuming ISO format or "YYYY-MM-DD"
    const orderDate = new Date(order.date || order.createdAt)
    return orderDate >= now && orderDate <= twentyFourHoursLater
  })

  const totalUrgent = urgentBookings.length + urgentOrders.length

  if (totalUrgent === 0) {
    return null
  }

  const itemType = urgentBookings.length > 0 && urgentOrders.length > 0
    ? 'items'
    : urgentBookings.length > 0
      ? 'appointments'
      : 'orders'

  return (
    <div className="urgent-alerts-banner">
      <div className="urgent-banner-content">
        <span className="urgent-icon">⚠️</span>
        <span className="urgent-text">
          <strong>Action Required:</strong> You have <strong>{totalUrgent}</strong> {itemType} due
          within 24 hours.
        </span>
      </div>
      <div className="urgent-banner-details">
        {urgentBookings.length > 0 && (
          <span className="urgent-detail">
            {urgentBookings.length} appointment{urgentBookings.length !== 1 ? 's' : ''}
          </span>
        )}
        {urgentOrders.length > 0 && (
          <span className="urgent-detail">
            {urgentOrders.length} order{urgentOrders.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

export default UrgentAlerts
