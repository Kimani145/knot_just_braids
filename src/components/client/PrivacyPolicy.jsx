import React from 'react'

function PrivacyPolicy() {
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
      }}>Privacy Policy for Knot Just</h1>
      
      <p style={{
        color: 'var(--muted)',
        fontSize: '0.9rem',
        marginBottom: '2.5rem',
      }}>Last Updated: June 25, 2026</p>
      
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
      </div>
    </div>
  )
}

export default PrivacyPolicy
