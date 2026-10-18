import React from 'react'
import { Bell, Check, X } from 'lucide-react'
import AdminPanel from '../AdminPanel'

export default function BookingsManager({
  pendingBookings = [],
  loadingBookings = false,
  onBookingStatus,
  onReminder,
  onPreviewPhoto,
  renderSkeletonRows,
}) {
  return (
    <AdminPanel
      title="Appointment Requests"
      tagLabel="BOOKINGS"
      tagClass="tag-bookings"
      className="tour-appointments-panel"
    >
      <div id="adminBookings" className="tour-appointments-actions">
        {loadingBookings ? (
          renderSkeletonRows(3, 'bookings')
        ) : pendingBookings.length ? (
          pendingBookings.map((item) => {
            const chipClass =
              item.status === 'pending'
                ? 'sc-pending'
                : item.status === 'confirmed'
                  ? 'sc-confirmed'
                  : 'sc-declined'

            return (
              <div className="b-row" key={item.id}>
                <div className="b-top">
                  <span className="b-name">{item.name}</span>
                  <span className={`status-chip ${chipClass}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div className="b-sub">
                  {item.style} · {item.date} at {item.time}
                </div>
                {item.notes && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-color)',
                      opacity: 0.8,
                      marginTop: '4px',
                    }}
                  >
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
                {((item.referencePhotoUrls && item.referencePhotoUrls.length > 0) ||
                  item.referencePhotoUrl) && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {(item.referencePhotoUrls || [item.referencePhotoUrl]).map(
                      (url, i) =>
                        url && (
                          <img
                            key={i}
                            src={url}
                            alt="Reference"
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: '1px solid var(--border-color)',
                            }}
                            onClick={() => onPreviewPhoto(url)}
                            title="Click to view reference"
                          />
                        ),
                    )}
                  </div>
                )}
                {item.status === 'pending' ? (
                  <div className="b-actions">
                    <button
                      className="confirm-btn cb-confirm"
                      type="button"
                      onClick={() => onBookingStatus(item.id, 'confirmed')}
                    >
                      <Check size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Confirm
                    </button>
                    <button
                      className="confirm-btn cb-decline"
                      type="button"
                      onClick={() => onBookingStatus(item.id, 'declined')}
                    >
                      <X size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Decline
                    </button>
                    <button
                      className="confirm-btn"
                      type="button"
                      onClick={() => onReminder(item, 'booking')}
                    >
                      <Bell size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Remind
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })
        ) : (
          <p style={{ opacity: 0.4, fontSize: '0.8rem' }}>
            No pending actions.
          </p>
        )}
      </div>
    </AdminPanel>
  )
}
