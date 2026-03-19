import { useMemo, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { BOOKINGS_COLLECTION } from '../../constants/catalog'
import PolicyModal from './PolicyModal'
import {
  getStoredClientDetails,
  saveClientDetails,
} from '../../utils/clientDetailsStorage'

const createInitialForm = () => ({
  ...getStoredClientDetails(),
  date: '',
  time: '',
  length: '',
  notes: '',
})

function BookingSheet({ isOpen, styleName, onClose }) {
  const [form, setForm] = useState(createInitialForm)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [isPolicyOpen, setIsPolicyOpen] = useState(false)
  const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const resetSheet = () => {
    setForm(createInitialForm())
    setIsSuccess(false)
    setSubmitted(null)
    setIsPolicyOpen(false)
    setHasAgreedToPolicy(false)
    setSubmitError('')
    setIsSubmitting(false)
  }

  const handleCloseSheet = () => {
    resetSheet()
    onClose?.()
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const submitBooking = async () => {
    const trimmedFirstName = form.firstName.trim()
    const trimmedLastName = form.lastName.trim()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()
    const bookingRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
      name: [trimmedFirstName, trimmedLastName].filter(Boolean).join(' '),
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedPhone,
      style: styleName,
      date: form.date,
      time: form.time,
      length: form.length,
      notes: form.notes.trim(),
      status: 'pending',
      agreedToPolicy: true,
      createdAt: serverTimestamp(),
    })

    saveClientDetails(form)
    setSubmitted({
      id: bookingRef.id,
      name: trimmedFirstName,
      style: styleName,
      date: form.date,
      time: form.time,
    })
    setIsSuccess(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (
      !form.firstName.trim() ||
      !form.email.trim() ||
      !styleName ||
      !form.date ||
      !form.time
    ) {
      window.alert('Please fill in your name, email, style, date, and time.')
      return
    }

    if (!hasAgreedToPolicy) {
      window.alert('Please agree to the Booking & Shop Policies before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await submitBooking()
    } catch (error) {
      console.error('Booking submission failed:', error)
      setSubmitError('Unable to submit your appointment request right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} id="bookingOverlay">
      <div className="sheet">
        <div className="sheet-header">
          <h2 id="bookingSheetTitle">Request Appointment</h2>
          <button className="close-btn" onClick={handleCloseSheet} type="button">
            ✕
          </button>
        </div>
        <div id="bookingContent">
          {isSuccess && submitted ? (
            <div className="success-state">
              <div className="icon">✅</div>
              <h3>Booking Requested!</h3>
              <p>
                Hi {submitted.name}! Your request for{' '}
                <strong>{submitted.style}</strong> on{' '}
                <strong>
                  {submitted.date} at {submitted.time}
                </strong>{' '}
                has been received.
                <br />
                <br />
                Confirmation emails sent to both you and your stylist. You'll
                receive a final email once the appointment is locked in.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleCloseSheet}
                type="button"
              >
                Done
              </button>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="fg">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder="Amara"
                  />
                </div>
                <div className="fg">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    placeholder="Osei"
                  />
                </div>
              </div>
              <div className="fg">
                <label>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="amara@email.com"
                />
              </div>
              <div className="fg">
                <label>Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+27 xxx xxx xxxx"
                />
              </div>
              <div className="fg">
                <label>Style</label>
                <input
                  type="text"
                  value={styleName}
                  readOnly
                  style={{ opacity: 0.7 }}
                />
              </div>
              <div className="form-row">
                <div className="fg">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={minDate}
                    onChange={handleChange('date')}
                  />
                </div>
                <div className="fg">
                  <label>Preferred Time</label>
                  <select value={form.time} onChange={handleChange('time')}>
                    <option value="">— Select —</option>
                    <option>08:00</option>
                    <option>09:00</option>
                    <option>10:00</option>
                    <option>11:00</option>
                    <option>12:00</option>
                    <option>13:00</option>
                    <option>14:00</option>
                    <option>15:00</option>
                    <option>16:00</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label>Hair Length</label>
                <select value={form.length} onChange={handleChange('length')}>
                  <option value="">— Select —</option>
                  <option>Short (above shoulders)</option>
                  <option>Medium (shoulder length)</option>
                  <option>Long (below shoulders)</option>
                </select>
              </div>
              <div className="fg">
                <label>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  placeholder="Reference photos, special requests..."
                />
              </div>
              <div className="note">
                📧 You'll receive an automated email on submission, and a final
                confirmation with style, date & time once approved.
              </div>
              <div className="fg policy-agreement">
                <input
                  type="checkbox"
                  id="booking-agree-policy"
                  checked={hasAgreedToPolicy}
                  onChange={(event) => setHasAgreedToPolicy(event.target.checked)}
                  required
                  style={{ width: 'auto' }}
                />
                <label htmlFor="booking-agree-policy">
                  I agree to the{' '}
                  <button
                    className="policy-inline-link"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      setIsPolicyOpen(true)
                    }}
                  >
                    Booking & Shop Policies
                  </button>
                  .
                </label>
              </div>
              {submitError ? (
                <p className="admin-auth-feedback admin-auth-feedback-error">
                  {submitError}
                </p>
              ) : null}
              <button className="btn btn-primary btn-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting Request...' : '✨ Request Appointment'}
              </button>
            </form>
          )}
        </div>
      </div>
      <PolicyModal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />
    </div>
  )
}

export default BookingSheet
