import { useEffect, useState } from 'react'
import Navigation from './components/layout/Navigation'
import FeedToggle from './components/layout/FeedToggle'
import Footer from './components/layout/Footer'
import ClientView from './components/client/ClientView'
import BookingSheet from './components/modals/BookingSheet'
import CartSheet from './components/modals/CartSheet'
import CheckoutSheet from './components/modals/CheckoutSheet'
import AdminView from './components/admin/AdminView'

const initialSalonStyles = [
  {
    id: 1,
    name: 'Knotless Box Braids',
    price: 120,
    duration: '5–7 hrs',
    emoji: '🌿',
    desc: 'Lightweight, natural-looking knotless braids',
    bg: 'sg1',
  },
  {
    id: 2,
    name: 'Butterfly Locs',
    price: 150,
    duration: '6–8 hrs',
    emoji: '🦋',
    desc: 'Gorgeous distressed bohemian locs',
    bg: 'sg2',
  },
  {
    id: 3,
    name: 'Ghana Weaving',
    price: 80,
    duration: '3–4 hrs',
    emoji: '👑',
    desc: 'Classic raised cornrow patterns',
    bg: 'sg3',
  },
  {
    id: 4,
    name: 'Faux Locs',
    price: 130,
    duration: '5–7 hrs',
    emoji: '✨',
    desc: 'Protective loc style using extensions',
    bg: 'sg4',
  },
  {
    id: 5,
    name: 'Passion Twists',
    price: 110,
    duration: '4–6 hrs',
    emoji: '💫',
    desc: 'Soft, romantic bohemian twists',
    bg: 'sg5',
  },
  {
    id: 6,
    name: 'Natural Twist Out',
    price: 60,
    duration: '2–3 hrs',
    emoji: '🌺',
    desc: 'Defined curls from your natural texture',
    bg: 'sg6',
  },
]

const initialBeadProducts = [
  {
    id: 1,
    name: 'Waist Beads Set',
    price: 25,
    stock: 8,
    emoji: '📿',
    desc: 'Handmade traditional waist beads in vibrant colors',
    bg: 'bg1',
  },
  {
    id: 2,
    name: 'Beaded Anklet',
    price: 15,
    stock: 12,
    emoji: '✨',
    desc: 'Delicate beaded anklet, adjustable fit',
    bg: 'bg2',
  },
  {
    id: 3,
    name: 'Wrist Bracelet',
    price: 18,
    stock: 15,
    emoji: '💚',
    desc: 'Colorful beaded wristband, handcrafted',
    bg: 'bg3',
  },
  {
    id: 4,
    name: 'Neck Piece',
    price: 35,
    stock: 5,
    emoji: '🌟',
    desc: 'Statement beaded necklace, custom colors available',
    bg: 'bg4',
  },
  {
    id: 5,
    name: 'Earrings Set',
    price: 20,
    stock: 10,
    emoji: '💜',
    desc: 'Lightweight beaded drop earrings',
    bg: 'bg5',
  },
  {
    id: 6,
    name: 'Custom Set',
    price: 55,
    stock: 3,
    emoji: '🎨',
    desc: 'Fully custom waist + ankle + wrist combo set',
    bg: 'bg6',
  },
]

const initialBookings = [
  {
    id: 'B001',
    name: 'Amara Osei',
    style: 'Butterfly Locs',
    date: '2026-03-18',
    time: '10:00',
    status: 'pending',
  },
  {
    id: 'B002',
    name: 'Kefilwe Dube',
    style: 'Ghana Weaving',
    date: '2026-03-19',
    time: '14:00',
    status: 'pending',
  },
]

const initialOrders = [
  {
    id: 'O1001',
    name: 'Siyanda Nkosi',
    items: 'Waist Beads Set x1, Anklet x2',
    total: 55,
    status: 'pending',
  },
]

const getViewFromPath = () => {
  if (typeof window === 'undefined') return 'client'
  return window.location.pathname === '/admin' ? 'admin' : 'client'
}

function App() {
  const [currentView, setCurrentView] = useState(getViewFromPath)
  const [activeFeed, setActiveFeed] = useState('salon')
  const [theme, setTheme] = useState('light')
  const [cart, setCart] = useState([])
  const [salonStyles, setSalonStyles] = useState(initialSalonStyles)
  const [beadProducts, setBeadProducts] = useState(initialBeadProducts)
  const [bookings, setBookings] = useState(initialBookings)
  const [orders, setOrders] = useState(initialOrders)
  const [adminMode, setAdminMode] = useState('dashboard')
  const [assetLibrary, setAssetLibrary] = useState([])
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingStyle, setBookingStyle] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  useEffect(() => {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const handlePop = () => {
      setCurrentView(getViewFromPath())
    }

    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.body.setAttribute('data-feed', activeFeed)
  }, [activeFeed])

  const cartCount = cart.reduce((sum, item) => sum + (item.qty || 0), 0)

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleOpenCart = () => {
    setIsCartOpen(true)
  }

  const handleCloseCart = () => {
    setIsCartOpen(false)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    setIsCartOpen(false)
    setIsCheckoutOpen(true)
  }

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false)
  }

  const handleOrderComplete = () => {
    setIsCheckoutOpen(false)
    setCart([])
  }

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExitAdmin = () => {
    window.history.pushState({}, '', '/')
    setCurrentView('client')
    setAdminMode('dashboard')
  }

  const handleBookStyle = (item) => {
    setBookingStyle(item.name)
    setIsBookingOpen(true)
  }

  const handleCloseBooking = () => {
    setIsBookingOpen(false)
  }

  const handleAddToCart = (item) => {
    if (item.stock !== undefined && item.stock <= 0) {
      window.alert('Out of stock!')
      return
    }

    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id)
      if (existing) {
        const max = item.stock ?? existing.qty + 1
        const nextQty = Math.min(existing.qty + 1, max)
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, qty: nextQty } : entry,
        )
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          emoji: item.emoji,
          bg: item.bg,
          qty: 1,
          stock: item.stock,
        },
      ]
    })
  }

  return (
    <>
      <div
        id="view-client"
        className={`view${currentView === 'client' ? ' active' : ''}`}
      >
        <Navigation
          theme={theme}
          onToggleTheme={handleToggleTheme}
          cartCount={cartCount}
          onOpenCart={handleOpenCart}
          onLogoClick={handleLogoClick}
        />
        <FeedToggle activeFeed={activeFeed} onChange={setActiveFeed} />
        <ClientView
          activeFeed={activeFeed}
          salonStyles={salonStyles}
          beadProducts={beadProducts}
          onBook={handleBookStyle}
          onAddToCart={handleAddToCart}
        />
        <Footer />
      </div>

      <div
        id="view-admin"
        className={`view${currentView === 'admin' ? ' active' : ''}`}
      >
        <AdminView
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onExit={handleExitAdmin}
          adminMode={adminMode}
          setAdminMode={setAdminMode}
          assetLibrary={assetLibrary}
          setAssetLibrary={setAssetLibrary}
          salonStyles={salonStyles}
          setSalonStyles={setSalonStyles}
          beadProducts={beadProducts}
          setBeadProducts={setBeadProducts}
          bookings={bookings}
          setBookings={setBookings}
          orders={orders}
          setOrders={setOrders}
        />
      </div>

      <BookingSheet
        isOpen={isBookingOpen}
        styleName={bookingStyle}
        onClose={handleCloseBooking}
      />
      <CartSheet
        isOpen={isCartOpen}
        cart={cart}
        setCart={setCart}
        onClose={handleCloseCart}
        onCheckout={handleCheckout}
      />
      <CheckoutSheet
        isOpen={isCheckoutOpen}
        cart={cart}
        onClose={handleCloseCheckout}
        onComplete={handleOrderComplete}
      />
    </>
  )
}

export default App
