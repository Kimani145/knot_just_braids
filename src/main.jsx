import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry, Sentry } from './utils/sentry.js'
import { initAnalytics } from './services/analytics.js'

initSentry()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: '1rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              backgroundColor: 'var(--salon-accent)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Refresh Page
          </button>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
