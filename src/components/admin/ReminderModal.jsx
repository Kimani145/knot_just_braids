import './ReminderModal.css'

/**
 * ReminderModal - Inline modal for selecting reminder channel (WhatsApp or Email)
 * Replaces native window.prompt with a sleek React UI
 */
function ReminderModal({
  isOpen,
  item,
  type,
  onSendWhatsApp,
  onSendEmail,
  onClose,
  clientPhone,
  clientEmail,
}) {
  if (!isOpen) return null

  const hasPhone = Boolean(clientPhone)
  const hasEmail = Boolean(clientEmail)

  return (
    <>
      {/* Overlay */}
      <div className="reminder-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="reminder-modal">
        <div className="reminder-modal-header">
          <h3>Send Reminder</h3>
          <button className="reminder-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="reminder-modal-body">
          <p className="reminder-label">
            {type === 'booking'
              ? `Send reminder for ${item.name}'s appointment? `
              : `Send reminder for ${item.name}'s order?`}
          </p>

          <div className="reminder-buttons">
            <button
              className="reminder-btn whatsapp-btn"
              onClick={onSendWhatsApp}
              disabled={!hasPhone}
              title={hasPhone ? 'Send via WhatsApp' : 'No phone number available'}
            >
              📱 WhatsApp
              {!hasPhone && <span className="no-data-badge">No data</span>}
            </button>

            <button
              className="reminder-btn email-btn"
              onClick={onSendEmail}
              disabled={!hasEmail}
              title={hasEmail ? 'Send via Email' : 'No email address available'}
            >
              ✉️ Email
              {!hasEmail && <span className="no-data-badge">No data</span>}
            </button>
          </div>
        </div>

        <div className="reminder-modal-footer">
          <button className="reminder-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

export default ReminderModal
