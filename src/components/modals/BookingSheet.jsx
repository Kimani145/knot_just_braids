import { useEffect, useMemo, useState } from 'react'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  date: '',
  time: '',
  length: '',
  notes: '',
}

function BookingSheet({ isOpen, styleName, onClose }) {
  const [form, setForm] = useState(initialForm)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm)
      setIsSuccess(false)
      setSubmitted(null)
    }
  }, [isOpen, styleName])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.firstName || !form.email || !styleName || !form.date || !form.time) {
      window.alert('Please fill in your name, email, style, date, and time.')
      return
    }

    setSubmitted({
      name: form.firstName,
      style: styleName,
      date: form.date,
      time: form.time,
    })
    setIsSuccess(true)
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} id="bookingOverlay">
      <div className="sheet">
        <div className="sheet-header">
          <h2 id="bookingSheetTitle">Request Appointment</h2>
          <button className="close-btn" onClick={onClose} type="button">
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
              <button className="btn btn-primary" onClick={onClose} type="button">
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
              <button className="btn btn-primary btn-full" type="submit">
                ✨ Request Appointment
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingSheet
