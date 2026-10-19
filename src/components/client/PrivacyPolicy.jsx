import React, { useState, useEffect } from 'react'
import { BRAND } from '../../constants/brand.js'
import { getConsentStatus, setConsentStatus } from '../../services/analytics.js'

function PrivacyPolicy() {
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

  const handleToggleConsent = () => {
    const nextStatus = consent === 'granted' ? 'denied' : 'granted'
    setConsentStatus(nextStatus)
    setConsent(nextStatus)
  }

  return (
    <div className="policy-container" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '3rem 1.5rem',
      color: 'var(--text)',
    }}>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '2.5rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
        color: 'var(--text)',
      }}>Privacy Policy for {BRAND.name}</h1>
      
      <p style={{
        color: 'var(--muted)',
        fontSize: '0.9rem',
        marginBottom: '2.5rem',
      }}>Last Updated: October 18, 2026</p>
      
      <div className="policy-content" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        lineHeight: '1.7',
      }}>
        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you book an appointment or place an order. 
            This includes your name, email address, phone number (WhatsApp), and delivery address.
          </p>
        </section>

        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>2. How We Use Your Information</h2>
          <p>
            We use the information to process and fulfill orders/bookings, send technical notices and support messages, 
            and communicate via email or WhatsApp.
          </p>
        </section>

        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>3. Third-Party Services and APIs</h2>
          <p>
            Our website utilizes third-party APIs (such as the TikTok Display API) to display public social media content. 
            We do not collect personal data from these platforms on behalf of our users. Data retrieved is limited to public 
            media embeds and follows the respective privacy policies of those platforms.
          </p>
        </section>

        {/* TODO(legal-review) */}
        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>Embedded Video (TikTok)</h2>
          <p>
            Our catalog product views may include optional embedded video content hosted by TikTok. Embedded video playback begins only after you interact with the player by tapping play. Upon activation, TikTok may set cookies and collect technical or browsing data under its own policy. For details regarding their data collection and usage practices, please consult{' '}
            <a
              href="https://www.tiktok.com/legal/page/row/privacy-policy/en"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--feed, var(--salon-accent))', textDecoration: 'underline' }}
            >
              TikTok's Privacy Policy
            </a>
            .
          </p>
        </section>

        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>4. Data Security</h2>
          <p>
            We implement reasonable security measures (including secure Firebase database architecture) to protect your personal information.
          </p>
        </section>

        {/* TODO(legal-review) */}
        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>5. Error Monitoring & Diagnostics (Sentry)</h2>
          <p>
            To maintain service reliability and diagnose software defects, we use Sentry for automated error monitoring. In strict compliance with the Kenya Data Protection Act 2019, all telemetry data is processed through automated client-side sanitizers that scrub and redact all customer names, email addresses, phone numbers, delivery addresses, and payment data prior to transmission. No customer-identifying information is ever stored in application error logs.
          </p>
        </section>

        {/* TODO(legal-review) */}
        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>6. Analytics & Cookie Preferences</h2>
          <p>
            We respect your privacy choices. Analytics cookies and metrics collection are strictly disabled by default. If you choose to opt in, anonymous diagnostic usage metrics may be gathered to understand storefront traffic patterns. No personal identifying information (PII) is included in analytics data.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Current Preference: <strong>{consent === 'granted' ? 'Analytics Allowed' : 'Analytics Declined'}</strong>
            </span>
            <button
              type="button"
              onClick={handleToggleConsent}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {consent === 'granted' ? 'Disable Analytics' : 'Enable Analytics'}
            </button>
          </div>
        </section>

        {/* TODO(legal-review) */}
        <section style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          transition: 'background var(--transition), border-color var(--transition)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--feed, var(--salon-accent))',
          }}>7. Your Rights Under the Kenya Data Protection Act 2019</h2>
          <p>
            As a data subject in Kenya, you possess statutory rights regarding your personal data:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Right to be informed:</strong> To know how your personal data is collected and processed.</li>
            <li><strong>Right of access:</strong> To request a copy of the personal information we hold about you.</li>
            <li><strong>Right to rectification:</strong> To request correction of false, inaccurate, or misleading information.</li>
            <li><strong>Right to erasure (deletion):</strong> To request deletion of your personal data where there is no legal basis to retain it.</li>
            <li><strong>Right to object:</strong> To opt out of direct communication or non-essential data processing.</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            To exercise any of these rights, please contact our Data Protection representative via WhatsApp or email through the storefront contact channels.
          </p>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPolicy
