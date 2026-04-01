import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as signOutAuth } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { SpeedInsights } from '@vercel/speed-insights/react'
import AnnouncementBar from './components/AnnouncementBar'
import Navigation from './components/layout/Navigation'
import FeedToggle from './components/layout/FeedToggle'
import Footer from './components/layout/Footer'
import ClientView from './components/client/ClientView'
import BookingSheet from './components/modals/BookingSheet'
import CartSheet from './components/modals/CartSheet'
import CheckoutSheet from './components/modals/CheckoutSheet'
import AdminLogin from './components/admin/AdminLogin'
import AdminView from './components/admin/AdminView'
import { auth, db } from './firebase'
import {
  BEAD_BACKGROUNDS,
  BEAD_PRODUCTS_COLLECTION,
  BOOKINGS_COLLECTION,
  ORDERS_COLLECTION,
  SALON_BACKGROUNDS,
  SALON_STYLES_COLLECTION,
} from './constants/catalog'

const getViewFromPath = () => {
  if (typeof window === 'undefined') return 'client'
  return window.location.pathname === '/admin' ? 'admin' : 'client'
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const getInitialFeed = () => {
  if (typeof window === 'undefined') return 'salon'

  const storedFeed = window.localStorage.getItem('knotJustFeed')
  return storedFeed === 'beads' ? 'beads' : 'salon'
}

const mapSalonStyle = (docSnapshot, index) => {
  const data = docSnapshot.data()

  return {
    id: docSnapshot.id,
    name: data.name ?? 'Untitled style',
    price: Number(data.price) || 0,
    duration: data.duration ?? '—',
    emoji: data.emoji ?? '✨',
    desc: data.description ?? data.desc ?? 'New style',
    bg: data.bg ?? SALON_BACKGROUNDS[index % SALON_BACKGROUNDS.length],
    assetUrl: data.assetUrl ?? '',
  }
}

const mapBeadProduct = (docSnapshot, index) => {
  const data = docSnapshot.data()

  return {
    id: docSnapshot.id,
    name: data.name ?? 'Untitled product',
    price: Number(data.price) || 0,
    stock: Math.max(0, Number.parseInt(data.stock, 10) || 0),
    emoji: data.emoji ?? '📿',
    desc: data.description ?? data.desc ?? 'New product',
    bg: data.bg ?? BEAD_BACKGROUNDS[index % BEAD_BACKGROUNDS.length],
    assetUrl: data.assetUrl ?? '',
  }
}

const getDisplayName = (data) => {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
  const explicitName = typeof data.name === 'string' ? data.name.trim() : ''
  return explicitName || fullName || ''
}

const mapBooking = (docSnapshot) => {
  const data = docSnapshot.data()
  const displayName = getDisplayName(data)

  return {
    id: docSnapshot.id,
    ...data,
    clientName: data.clientName || displayName || 'Unknown',
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    name: displayName || 'Appointment request',
    style: data.style ?? data.service ?? 'Style request',
    date: data.date ?? 'Date pending',
    time: data.time ?? 'Time pending',
    status: data.status ?? 'pending',
  }
}

const mapOrder = (docSnapshot) => {
  const data = docSnapshot.data()
  const displayName = getDisplayName(data)
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []
  const itemSummary =
    typeof data.items === 'string' && data.items.trim()
      ? data.items
      : lineItems
          .map((item) => `${item.name ?? 'Item'} x${Number(item.qty) || 0}`)
          .join(', ')

  return {
    id: docSnapshot.id,
    ...data,
    clientName: data.clientName || displayName || 'Unknown',
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    name: displayName || 'Order customer',
    items: itemSummary || 'Order details pending',
    total: Number(data.total) || 0,
    status: data.status ?? 'pending',
  }
}

function App() {
  const [currentView, setCurrentView] = useState(getViewFromPath)
  const [activeFeed, setActiveFeed] = useState(getInitialFeed)
  const [theme, setTheme] = useState(getInitialTheme)
  const [adminUser, setAdminUser] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [cart, setCart] = useState([])
  const [salonStyles, setSalonStyles] = useState([])
  const [beadProducts, setBeadProducts] = useState([])
  const [loadingSalon, setLoadingSalon] = useState(true)
  const [loadingBeads, setLoadingBeads] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])
  const [adminMode, setAdminMode] = useState('dashboard')
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingStyle, setBookingStyle] = useState('')
  const [bookingStyleImageUrl, setBookingStyleImageUrl] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  useEffect(() => {
    const handlePop = () => {
      setCurrentView(getViewFromPath())
    }

    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user)
      if (user) {
        setLoadingBookings(true)
        setLoadingOrders(true)
      } else {
        setBookings([])
        setOrders([])
        setLoadingBookings(false)
        setLoadingOrders(false)
      }
      setIsAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, SALON_STYLES_COLLECTION),
      (snapshot) => {
        setSalonStyles(snapshot.docs.map((doc, index) => mapSalonStyle(doc, index)))
        setLoadingSalon(false)
      },
      (error) => {
        console.error('Failed to sync salon_styles:', error)
        setLoadingSalon(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, BEAD_PRODUCTS_COLLECTION),
      (snapshot) => {
        setBeadProducts(snapshot.docs.map((doc, index) => mapBeadProduct(doc, index)))
        setLoadingBeads(false)
      },
      (error) => {
        console.error('Failed to sync bead_products:', error)
        setLoadingBeads(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!adminUser) return

    const unsubscribe = onSnapshot(
      collection(db, BOOKINGS_COLLECTION),
      (snapshot) => {
        setBookings(snapshot.docs.map((doc) => mapBooking(doc)))
        setLoadingBookings(false)
      },
      (error) => {
        console.error('Failed to sync bookings:', error)
        setBookings([])
        setLoadingBookings(false)
      },
    )

    return () => unsubscribe()
  }, [adminUser])

  useEffect(() => {
    if (!adminUser) return

    const unsubscribe = onSnapshot(
      collection(db, ORDERS_COLLECTION),
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => mapOrder(doc)))
        setLoadingOrders(false)
      },
      (error) => {
        console.error('Failed to sync orders:', error)
        setOrders([])
        setLoadingOrders(false)
      },
    )

    return () => unsubscribe()
  }, [adminUser])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.body.setAttribute('data-feed', activeFeed)
  }, [activeFeed])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('knotJustFeed', activeFeed)
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
    setCart([])
  }

  const switchToAdmin = () => {
    window.history.pushState({}, '', '/admin')
    setCurrentView('admin')
  }

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const leaveAdminRoute = () => {
    window.history.pushState({}, '', '/')
    setCurrentView('client')
    setAdminMode('dashboard')
  }

  const handleAdminSignOut = async () => {
    try {
      await signOutAuth(auth)
      leaveAdminRoute()
    } catch (error) {
      console.error('Admin sign-out failed:', error)
      window.alert('Unable to sign out right now.')
    }
  }

  const handleBookStyle = (item) => {
    setBookingStyle(item.name)
    setBookingStyleImageUrl(item.assetUrl || item.image || '')
    setIsBookingOpen(true)
  }

  const handleCloseBooking = () => {
    setIsBookingOpen(false)
    setBookingStyleImageUrl('')
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
          assetUrl: item.assetUrl,
          qty: 1,
          stock: item.stock,
        },
      ]
    })
  }

  return (
    <>
      <SpeedInsights />
      <div
        id="view-client"
        className={`view${currentView === 'client' ? ' active' : ''}`}
      >
        <AnnouncementBar />
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
          loadingSalon={loadingSalon}
          loadingBeads={loadingBeads}
          onBook={handleBookStyle}
          onAddToCart={handleAddToCart}
        />
        <Footer />
      </div>

      <div
        id="view-admin"
        className={`view${currentView === 'admin' ? ' active' : ''}`}
      >
        {currentView === 'admin' ? (
          adminUser ? (
            <AdminView
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onSignOut={handleAdminSignOut}
              adminUser={adminUser}
              adminMode={adminMode}
              setAdminMode={setAdminMode}
              salonStyles={salonStyles}
              beadProducts={beadProducts}
              loadingSalon={loadingSalon}
              loadingBeads={loadingBeads}
              loadingBookings={loadingBookings}
              loadingOrders={loadingOrders}
              bookings={bookings}
              orders={orders}
            />
          ) : (
            <AdminLogin
              isCheckingSession={!isAuthReady}
              onBackToStore={leaveAdminRoute}
            />
          )
        ) : (
          null
        )}
      </div>

      <BookingSheet
        isOpen={isBookingOpen}
        styleName={bookingStyle}
        styleImageUrl={bookingStyleImageUrl}
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
