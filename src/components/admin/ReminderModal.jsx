import { Mail, MessageSquare, X } from 'lucide-react'
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
      <div className="reminder-modal" role="dialog" aria-modal="true" aria-labelledby="reminderModalTitle">
        <div className="reminder-modal-header">
          <h3 id="reminderModalTitle">Send Reminder</h3>
          <button className="reminder-close-btn" onClick={onClose} type="button" aria-label="Close reminder modal">
            <X size={18} />
          </button>
        </div>

        <div className="reminder-modal-body">
          <p className="reminder-label">
            {type === 'booking'
              ? `Send reminder for ${item?.name || 'client'}'s appointment? `
              : `Send reminder for ${item?.name || 'client'}'s order?`}
          </p>

          <div className="reminder-buttons">
            <button
              type="button"
              className="reminder-btn whatsapp-btn"
              onClick={onSendWhatsApp}
              disabled={!hasPhone}
              title={hasPhone ? 'Send via WhatsApp' : 'No phone number available'}
            >
              <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              WhatsApp
              {!hasPhone && <span className="no-data-badge">No data</span>}
            </button>

            <button
              type="button"
              className="reminder-btn email-btn"
              onClick={onSendEmail}
              disabled={!hasEmail}
              title={hasEmail ? 'Send via Email' : 'No email address available'}
            >
              <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Email
              {!hasEmail && <span className="no-data-badge">No data</span>}
            </button>
          </div>
        </div>

        <div className="reminder-modal-footer">
          <button className="reminder-cancel-btn" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

export default ReminderModal
