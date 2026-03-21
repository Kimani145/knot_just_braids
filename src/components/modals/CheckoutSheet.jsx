import { useMemo, useState } from 'react'
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import PolicyModal from './PolicyModal'
import { db } from '../../firebase'
import {
  BEAD_PRODUCTS_COLLECTION,
  ORDERS_COLLECTION,
} from '../../constants/catalog'
import formatCurrency from '../../utils/formatCurrency'
import {
  getStoredClientDetails,
  saveClientDetails,
} from '../../utils/clientDetailsStorage'
import { sendDynamicEmail } from '../../utils/emailService'
import { generateOrderHTML } from '../../utils/emailTemplates'

const createInitialForm = () => ({
  ...getStoredClientDetails(),
  address: '',
})

function CheckoutSheet({ isOpen, cart, onClose, onComplete }) {
  const [form, setForm] = useState(createInitialForm)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolicyOpen, setIsPolicyOpen] = useState(false)
  const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false)

  const totals = useMemo(() => {
    const total = cart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * item.qty
    }, 0)
    return { total, count: cart.length }
  }, [cart])

  const resetSheet = () => {
    setForm(createInitialForm())
    setIsSuccess(false)
    setSubmitted(null)
    setSubmitError('')
    setIsSubmitting(false)
    setIsPolicyOpen(false)
    setHasAgreedToPolicy(false)
  }

  const handleCloseSheet = () => {
    resetSheet()
    onClose?.()
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const getFriendlySubmitError = (error) => {
    if (!error?.message) {
      return 'Sorry, another user just purchased the last of an item in your cart. Please review your cart and try again.'
    }

    if (
      error.message.startsWith('Not enough stock for') ||
      error.message.startsWith('This item is no longer available')
    ) {
      return error.message
    }

    return 'Sorry, another user just purchased the last of an item in your cart. Please review your cart and try again.'
  }

  const submitOrder = async () => {
    const trimmedFirstName = form.firstName.trim()
    const trimmedLastName = form.lastName.trim()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()
    const trimmedAddress = form.address.trim()
    const customerName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ')
    const itemSummary = cart
      .map((item) => `${item.name} x${Number(item.qty) || 0}`)
      .join(', ')
    const orderRef = doc(collection(db, ORDERS_COLLECTION))

    console.info('[CheckoutSheet] Starting order transaction...', {
      orderId: orderRef.id,
      itemCount: cart.length,
      total: totals.total,
      hasEmail: Boolean(trimmedEmail),
      hasAddress: Boolean(trimmedAddress),
    })

    await runTransaction(db, async (transaction) => {
      for (const item of cart) {
        const productRef = doc(db, BEAD_PRODUCTS_COLLECTION, String(item.id))
        const productSnapshot = await transaction.get(productRef)

        if (!productSnapshot.exists()) {
          throw new Error(`This item is no longer available: ${item.name}`)
        }

        const productData = productSnapshot.data()
        const currentStock = Math.max(
          0,
          Number.parseInt(productData.stock, 10) || 0,
        )
        const quantity = Math.max(1, Number.parseInt(item.qty, 10) || 0)

        if (currentStock < quantity) {
          throw new Error(`Not enough stock for ${item.name}`)
        }

        console.info('[CheckoutSheet] Stock check passed', {
          orderId: orderRef.id,
          item: item.name,
          requestedQty: quantity,
          currentStock,
        })

        transaction.update(productRef, { stock: currentStock - quantity })
      }

      transaction.set(orderRef, {
        clientName: customerName || trimmedFirstName,
        clientEmail: trimmedEmail,
        clientPhone: trimmedPhone,
        name: customerName || trimmedFirstName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        items: itemSummary,
        lineItems: cart.map((item) => ({
          id: item.id,
          name: item.name,
          qty: Math.max(1, Number.parseInt(item.qty, 10) || 0),
          price: Number(item.price) || 0,
          assetUrl: item.assetUrl || '',
          emoji: item.emoji || '',
        })),
        total: totals.total,
        status: 'pending',
        agreedToPolicy: true,
        createdAt: serverTimestamp(),
      })
    })
    console.info('[CheckoutSheet] Order transaction committed', { orderId: orderRef.id })

    // Build a richer HTML summary for EmailJS templates with item thumbnails.
    const orderItemsHtml = cart
      .map((item) => {
        const quantity = Number(item.qty) || 0
        const unitPrice = Number(item.price) || 0
        const imageUrl = item.image || item.assetUrl || ''

        return `
  <div style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
    <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 15px;" />
    <div>
      <p style="margin: 0; font-weight: bold; color: #1a1a1a;">${item.name}</p>
      <p style="margin: 0; font-size: 0.9em; color: #555;">Qty: ${quantity} | Kshs ${unitPrice * quantity}</p>
    </div>
  </div>
`
      })
      .join('')

    // Send order confirmation email - don't block on failure
    try {
      const orderHtml = generateOrderHTML({
        clientName: customerName || trimmedFirstName,
        orderId: orderRef.id,
        total: formatCurrency(totals.total),
        address: trimmedAddress,
        itemsHtml: orderItemsHtml,
      })

      console.info('[CheckoutSheet] Sending order confirmation email...', {
        orderId: orderRef.id,
      })
      await sendDynamicEmail({
        to_email: trimmedEmail,
        to_name: customerName || trimmedFirstName,
        subject: `Order Confirmation #${orderRef.id}`,
        html_content: orderHtml,
      })
      console.info('[CheckoutSheet] Order confirmation email sent', {
        orderId: orderRef.id,
      })
    } catch (emailError) {
      console.error('[CheckoutSheet] Order email failed', {
        orderId: orderRef.id,
        message: emailError?.message,
        status: emailError?.status,
      })
      // Don't block the success state if email fails
    }

    const createdOrder = {
      id: orderRef.id,
      name: customerName || trimmedFirstName,
      items: itemSummary,
      total: totals.total,
      status: 'pending',
    }

    saveClientDetails(form)
    setSubmitted({
      name: trimmedFirstName,
      email: trimmedEmail,
      orderId: orderRef.id,
    })
    setIsSuccess(true)
    onComplete?.(createdOrder)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.firstName.trim() || !form.email.trim() || !form.address.trim()) {
      window.alert('Please fill in your name, email, and delivery address.')
      return
    }

    if (!cart.length) {
      window.alert('Your cart is empty.')
      return
    }

    if (!hasAgreedToPolicy) {
      window.alert('Please agree to the Booking & Shop Policies before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      console.info('[CheckoutSheet] Starting checkout submit')
      await submitOrder()
      console.info('[CheckoutSheet] Checkout submit finished successfully')
    } catch (error) {
      console.error('[CheckoutSheet] Order transaction failed', {
        message: error?.message,
      })
      setSubmitError(getFriendlySubmitError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    resetSheet()
    onClose?.()
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} id="checkoutOverlay">
      <div className="sheet">
        <div className="sheet-header">
          <h2>Checkout</h2>
          <button className="close-btn" onClick={handleCloseSheet} type="button">
            ✕
          </button>
        </div>
        <div id="checkoutContent">
          {isSuccess && submitted ? (
            <div className="success-state">
              <div className="icon">📦</div>
              <h3>Order Placed!</h3>
              <p>
                Thanks {submitted.name}! Your order has been received.
                <br />
                <br />
                Confirmation sent to <strong>{submitted.email}</strong>. We'll
                process and ship to your address shortly.
                <br />
                <br />
                Order reference <strong>#{submitted.orderId}</strong>.
              </p>
              <button
                className="btn btn-full"
                style={{
                  background: 'var(--bead-accent)',
                  color: 'white',
                  marginTop: '0.5rem',
                }}
                onClick={handleDone}
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
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="amara@email.com"
                />
              </div>
              <div className="fg">
                <label>Delivery Address</label>
                <textarea
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder="Street, City, Province, Postal Code"
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
              <div className="note" id="co-summary">
                🛒 {totals.count} item(s) —{' '}
                <strong>Total: {formatCurrency(totals.total)}</strong>
              </div>
              {submitError ? (
                <p className="admin-auth-feedback admin-auth-feedback-error">
                  {submitError}
                </p>
              ) : null}
              <div className="fg policy-agreement">
                <input
                  type="checkbox"
                  id="checkout-agree-policy"
                  checked={hasAgreedToPolicy}
                  onChange={(event) => setHasAgreedToPolicy(event.target.checked)}
                  required
                  style={{ width: 'auto' }}
                />
                <label htmlFor="checkout-agree-policy">
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
              <button
                className="btn btn-primary btn-full"
                style={{ background: 'var(--bead-accent)' }}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing Order...' : '📦 Place Order'}
              </button>
            </form>
          )}
        </div>
      </div>
      <PolicyModal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />
    </div>
  )
}

export default CheckoutSheet
