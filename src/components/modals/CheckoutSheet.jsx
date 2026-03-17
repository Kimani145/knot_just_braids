import { useEffect, useMemo, useState } from 'react'
import formatCurrency from '../../utils/formatCurrency'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  phone: '',
}

function CheckoutSheet({ isOpen, cart, onClose, onComplete }) {
  const [form, setForm] = useState(initialForm)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const totals = useMemo(() => {
    const total = cart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * item.qty
    }, 0)
    return { total, count: cart.length }
  }, [cart])

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm)
      setIsSuccess(false)
      setSubmitted(null)
    }
  }, [isOpen])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.firstName || !form.email || !form.address) {
      window.alert('Please fill in your name, email, and delivery address.')
      return
    }

    setSubmitted({ name: form.firstName, email: form.email })
    setIsSuccess(true)
  }

  const handleDone = () => {
    onComplete?.()
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} id="checkoutOverlay">
      <div className="sheet">
        <div className="sheet-header">
          <h2>Checkout</h2>
          <button className="close-btn" onClick={onClose} type="button">
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
              </p>
              <button
                className="btn btn-full"
                style={{
                  background: 'var(--bead-accent)',
                  color: 'white',
                  marginTop: '0.5rem',
                }}
                onClick={handleDone}
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
              <button
                className="btn btn-primary btn-full"
                style={{ background: 'var(--bead-accent)' }}
                type="submit"
              >
                📦 Place Order
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckoutSheet
