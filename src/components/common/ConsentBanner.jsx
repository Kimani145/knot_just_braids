import React, { useState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getConsentStatus, setConsentStatus } from '../../services/analytics.js'

/**
 * Cookie & Privacy Consent Banner
 * Complies with Kenya Data Protection Act 2019 consent principles.
 * Optimized for Kenyan mobile viewports (360px baseline) and 44x44px touch targets.
 */
export default function ConsentBanner({ onOpenPrivacyPolicy }) {
  const [consent, setConsent] = useState(() => getConsentStatus())

  useEffect(() => {
    const handleConsentChange = (e) => {
      if (e.detail?.status) {
        setConsent(e.detail.status)
      }
    }
    window.addEventListener('consentChange', handleConsentChange)
    return () => {
      window.removeEventListener('consentChange', handleConsentChange)
    }
  }, [])

  if (consent !== 'pending') {
    return null
  }

  const handleAccept = () => {
    setConsentStatus('granted')
    setConsent('granted')
  }

  const handleDecline = () => {
    setConsentStatus('denied')
    setConsent('denied')
  }

  return (
    <div
      role="region"
      aria-label="Privacy and Cookie Consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'var(--surface, #ffffff)',
        borderTop: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        padding: '1rem',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        transition: 'transform 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
          <ShieldCheck
            size={22}
            style={{
              flexShrink: 0,
              color: 'var(--salon-accent, #2e5a2c)',
              marginTop: '0.125rem',
            }}
            aria-hidden="true"
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text, #102016)', lineHeight: 1.45 }}>
            <span>
              We use essential cookies for store operations and, with your permission, anonymous
              diagnostics to improve service quality.{' '}
            </span>
            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--salon-accent, #2e5a2c)',
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 600,
                display: 'inline',
              }}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleDecline}
            style={{
              minHeight: '44px',
              minWidth: '88px',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius, 6px)',
              border: '1px solid var(--border, #cbd5e1)',
              backgroundColor: 'transparent',
              color: 'var(--muted, #5b6b5b)',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              minHeight: '44px',
              minWidth: '100px',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius, 6px)',
              border: 'none',
              backgroundColor: 'var(--salon-accent, #2e5a2c)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
