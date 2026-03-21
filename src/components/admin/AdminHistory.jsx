import { useMemo } from 'react'
import AdminPanel from './AdminPanel'
import formatCurrency from '../../utils/formatCurrency'
import { SkeletonRow } from '../layout/Skeletons'
import './AdminHistory.css'

/**
 * AdminHistory - Immutable ledger view for completed bookings and orders
 * Shows all non-pending items grouped and sorted chronologically
 */
function AdminHistory({
  bookings = [],
  orders = [],
  loadingBookings = false,
  loadingOrders = false,
}) {
  const completedBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status !== 'pending')
        .sort((a, b) => {
          const dateA = new Date(a.date || 0)
          const dateB = new Date(b.date || 0)
          return dateB - dateA // Newest first
        }),
    [bookings],
  )

  const fulfilledOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'pending')
        .sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0)
          const dateB = new Date(b.date || b.createdAt || 0)
          return dateB - dateA // Newest first
        }),
    [orders],
  )

  const confirmedBookings = completedBookings.filter((b) => b.status === 'confirmed')
  const declinedBookings = completedBookings.filter((b) => b.status === 'declined')

  const renderSkeletonRows = (count = 3, prefix = 'history') =>
    Array.from({ length: count }, (_, index) => (
      <SkeletonRow key={`${prefix}-${index}`} />
    ))

  const formatDate = (date) => {
    if (!date) return '—'
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="admin-history-view">
      <div className="admin-panel span2" style={{ background: 'transparent', padding: '1.2rem 1.5rem 0' }}>
        <div className="history-header">
          <h2>📋 History & Archive</h2>
          <p>Immutable ledger of completed bookings and fulfilled orders</p>
        </div>
      </div>

      <div className="admin-body">
        {/* Completed Appointments */}
        <AdminPanel
          title="Completed Appointments"
          tagLabel="HISTORY"
          tagClass="tag-history"
        >
          {confirmedBookings.length > 0 ? (
            <div className="history-ledger">
              <div className="history-ledger-header">
                <span>Client</span>
                <span>Style</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              {confirmedBookings.map((booking) => (
                <div className="history-ledger-row confirmed" key={booking.id}>
                  <span className="history-cell client-name">{booking.name}</span>
                  <span className="history-cell style-name">{booking.style}</span>
                  <span className="history-cell date">
                    {formatDate(booking.date)}
                  </span>
                  <span className="history-cell status">
                    <span className="status-badge confirmed">✓ Confirmed</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>No confirmed appointments yet.</p>
          )}
        </AdminPanel>

        {declinedBookings.length > 0 && (
          <AdminPanel
            title="Declined Appointments"
            tagLabel="ARCHIVED"
            tagClass="tag-declined"
          >
            <div className="history-ledger">
              <div className="history-ledger-header">
                <span>Client</span>
                <span>Style</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              {declinedBookings.map((booking) => (
                <div className="history-ledger-row declined" key={booking.id}>
                  <span className="history-cell client-name">{booking.name}</span>
                  <span className="history-cell style-name">{booking.style}</span>
                  <span className="history-cell date">
                    {formatDate(booking.date)}
                  </span>
                  <span className="history-cell status">
                    <span className="status-badge declined">✕ Declined</span>
                  </span>
                </div>
              ))}
            </div>
          </AdminPanel>
        )}

        {/* Fulfilled Orders */}
        <AdminPanel
          title="Fulfilled Orders"
          tagLabel="ORDERS"
          tagClass="tag-orders"
        >
          {fulfilledOrders.length > 0 ? (
            <div className="history-ledger">
              <div className="history-ledger-header">
                <span>Client</span>
                <span>Items</span>
                <span>Amount</span>
                <span>Date</span>
              </div>
              {fulfilledOrders.map((order) => (
                <div className="history-ledger-row fulfilled" key={order.id}>
                  <span className="history-cell client-name">
                    {order.name}
                    <span style={{ opacity: 0.5, fontSize: '0.75rem' }}> #{order.id}</span>
                  </span>
                  <span className="history-cell items">{order.items}</span>
                  <span className="history-cell amount">
                    {formatCurrency(order.total)}
                  </span>
                  <span className="history-cell date">
                    {formatDate(order.date || order.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>No fulfilled orders yet.</p>
          )}
        </AdminPanel>

        {/* Summary Card */}
        {(confirmedBookings.length > 0 ||
          declinedBookings.length > 0 ||
          fulfilledOrders.length > 0) && (
          <div className="admin-panel span2" style={{ background: 'transparent', padding: '1.5rem' }}>
            <div className="history-summary">
              <div className="summary-stat">
                <span className="summary-label">Confirmed Appointments</span>
                <span className="summary-value">{confirmedBookings.length}</span>
              </div>
              {declinedBookings.length > 0 && (
                <div className="summary-stat">
                  <span className="summary-label">Declined Appointments</span>
                  <span className="summary-value declined-count">
                    {declinedBookings.length}
                  </span>
                </div>
              )}
              <div className="summary-stat">
                <span className="summary-label">Fulfilled Orders</span>
                <span className="summary-value">{fulfilledOrders.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminHistory
