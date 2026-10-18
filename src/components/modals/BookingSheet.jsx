import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CalendarCheck, Mail, X } from 'lucide-react'
import { db } from '../../firebase'
import { BOOKINGS_COLLECTION } from '../../constants/catalog'
import PolicyModal from './PolicyModal'
import {
  getStoredClientDetails,
  saveClientDetails,
} from '../../utils/clientDetailsStorage'
import { sendDynamicEmail } from '../../utils/emailService'
import { generateBookingHTML } from '../../utils/emailTemplates'
import { compressImage } from '../../utils/imageCompressor'
import {
  isApiCheckoutEnabled,
  submitApiBooking,
  uploadImageWithFallback,
} from '../../services/api'
import { toast } from 'sonner'

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
  const [referencePhotos, setReferencePhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    email: '',
    date: '',
    time: '',
  })

  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const resetSheet = useCallback(() => {
    setForm(createInitialForm())
    setIsSuccess(false)
    setSubmitted(null)
    setIsPolicyOpen(false)
    setHasAgreedToPolicy(false)
    setSubmitError('')
    setIsSubmitting(false)
    setFieldErrors({ firstName: '', email: '', date: '', time: '' })
    photoPreviews.forEach((preview) => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    })
    setReferencePhotos([])
    setPhotoPreviews([])
  }, [photoPreviews])

  const handleCloseSheet = useCallback(() => {
    resetSheet()
    onClose?.()
  }, [resetSheet, onClose])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setSubmitError('')

    const validFiles = []
    const newPreviews = []

    if (referencePhotos.length + files.length > 2) {
      setSubmitError('Maximum of 2 photos allowed. For more photos or videos, please contact us via social media.')
      return
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setSubmitError('Only image files are allowed.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('File size must be under 5MB per photo.')
        return
      }
      validFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    setReferencePhotos((prev) => [...prev, ...validFiles])
    setPhotoPreviews((prev) => [...prev, ...newPreviews])
    
    event.target.value = ''
  }

  const removePhoto = (index) => {
    if (photoPreviews[index] && photoPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviews[index])
    }
    setReferencePhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const submitBooking = async () => {
    const trimmedFirstName = form.firstName.trim()
    const trimmedLastName = form.lastName.trim()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()
    const clientName =
      [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ') ||
      trimmedFirstName
    console.info('[BookingSheet] Creating booking document...', {
      styleName,
      date: form.date,
      time: form.time,
      hasEmail: Boolean(trimmedEmail),
      hasPhone: Boolean(trimmedPhone),
    })
    
    let referencePhotoUrls = []
    if (referencePhotos.length > 0) {
      console.info('[BookingSheet] Uploading reference photos...')
      try {
        const uploadPromises = referencePhotos.map(async (rawPhoto) => {
          const photo = await compressImage(rawPhoto, { maxWidth: 1200, quality: 0.8 })
          const result = await uploadImageWithFallback(photo, {
            isReferencePhoto: true,
            folder: 'knot_just/reference_photos',
          })
          return result?.secure_url || null
        })

        const results = await Promise.all(uploadPromises)
        referencePhotoUrls = results.filter((url) => url !== null)
        console.info(`[BookingSheet] ${referencePhotoUrls.length} reference photo(s) uploaded successfully`)
      } catch (err) {
        console.error('[BookingSheet] Error uploading reference photos', err)
      }
    }

    let bookingId
    if (isApiCheckoutEnabled()) {
      console.info('[BookingSheet] Submitting booking via /api/booking...', {
        styleName,
        date: form.date,
        time: form.time,
        hasEmail: Boolean(trimmedEmail),
        hasPhone: Boolean(trimmedPhone),
      })

      const apiPayload = {
        clientName,
        clientEmail: trimmedEmail,
        clientPhone: trimmedPhone,
        style: styleName,
        date: form.date,
        time: form.time,
        length: form.length,
        notes: form.notes.trim(),
        referencePhotoUrls,
        agreedToPolicy: true,
      }

      const apiResult = await submitApiBooking(apiPayload)
      bookingId = apiResult.bookingId
      console.info('[BookingSheet] API booking request created', { bookingId })
    } else {
      const bookingRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
        clientName,
        clientEmail: trimmedEmail,
        clientPhone: trimmedPhone,
        name: clientName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        style: styleName,
        date: form.date,
        time: form.time,
        length: form.length,
        notes: form.notes.trim(),
        referencePhotoUrls,
        status: 'pending',
        agreedToPolicy: true,
        createdAt: serverTimestamp(),
      })
      bookingId = bookingRef.id
      console.info('[BookingSheet] Booking document created', { bookingId })
    }

    // Send booking confirmation email - don't block on failure
    try {
      const bookingHtml = generateBookingHTML({
        clientName,
        styleName,
        date: form.date,
        time: form.time,
        phone: trimmedPhone,
      })

      console.info('[BookingSheet] Sending booking confirmation email...', {
        bookingId,
      })
      await sendDynamicEmail({
        to_email: trimmedEmail,
        to_name: clientName,
        subject: `Appointment Request Received: ${styleName}`,
        html_content: bookingHtml,
      })
      console.info('[BookingSheet] Booking confirmation email sent', {
        bookingId,
      })
    } catch (emailError) {
      console.error('[BookingSheet] Booking email failed', {
        bookingId,
        message: emailError?.message,
        status: emailError?.status,
      })
      // Don't block the success state if email fails
    }

    saveClientDetails(form)
    setSubmitted({
      id: bookingId,
      name: trimmedFirstName,
      style: styleName,
      date: form.date,
      time: form.time,
    })
    setIsSuccess(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextFieldErrors = {
      firstName: form.firstName.trim() ? '' : 'First name is required.',
      email: form.email.trim() ? '' : 'Email is required.',
      date: form.date ? '' : 'Date is required.',
      time: form.time ? '' : 'Time is required.',
    }
    setFieldErrors(nextFieldErrors)
    if (!styleName || Object.values(nextFieldErrors).some(Boolean)) {
      return
    }

    if (!hasAgreedToPolicy) {
      toast.error('Please agree to the Booking & Shop Policies before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      console.info('[BookingSheet] Starting booking submit')
      await submitBooking()
      console.info('[BookingSheet] Booking submit finished successfully')
    } catch (error) {
      console.error('[BookingSheet] Booking submission failed', {
        message: error?.message,
      })
      setSubmitError('Unable to submit your appointment request right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        handleCloseSheet()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCloseSheet])

  // Scroll lock with cleanup
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseSheet()
    }
  }

  return (
    <div
      className={`overlay${isOpen ? ' open' : ''}`}
      id="bookingOverlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookingSheetTitle"
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="bookingSheetTitle">Request Appointment</h2>
          <button
            className="close-btn"
            onClick={handleCloseSheet}
            type="button"
            aria-label="Close booking sheet"
          >
            <X size={18} />
          </button>
        </div>
        <div id="bookingContent">
          {isSuccess && submitted ? (
            <div className="success-state">
              <div className="icon" aria-hidden="true">
                <CalendarCheck size={48} />
              </div>
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
                  {fieldErrors.firstName ? <span className="a-error">{fieldErrors.firstName}</span> : null}
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
                {fieldErrors.email ? <span className="a-error">{fieldErrors.email}</span> : null}
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
                  {fieldErrors.date ? <span className="a-error">{fieldErrors.date}</span> : null}
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
                  {fieldErrors.time ? <span className="a-error">{fieldErrors.time}</span> : null}
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
                  placeholder="Special requests, hair condition, etc..."
                />
              </div>
              <div className="fg">
                <label>Reference Photos (Optional, max 2, up to 5MB each)</label>
                <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#666' }}>
                  For more photos or videos, please share them with us via our social media channels.
                </div>
                {photoPreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {photoPreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img 
                          src={preview} 
                          alt={`Reference preview ${index + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} 
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          style={{
                            position: 'absolute', top: '-5px', right: '-5px',
                            background: '#ff4d4f', color: 'white', border: 'none',
                            borderRadius: '50%', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {referencePhotos.length < 2 && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    style={{ background: '#f9f9f9', padding: '8px', borderRadius: '4px', width: '100%' }}
                  />
                )}
              </div>
              <div className="note">
                <Mail
                  size={14}
                  style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}
                />
                You'll receive an automated email on submission, and a final
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
                {isSubmitting ? 'Submitting Request...' : 'Request Appointment →'}
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
