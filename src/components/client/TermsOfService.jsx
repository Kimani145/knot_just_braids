import React from 'react'

function TermsOfService() {
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
      }}>Terms of Service for Knot Just</h1>
      
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
          }}>1. Agreement to Terms</h2>
          <p>
            By accessing our website, booking a service, or purchasing products, you agree to be bound by these Terms.
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
          }}>2. Salon Services & Bookings</h2>
          <p>
            All appointments are subject to confirmation. A non-refundable deposit may be required. 
            You agree to ensure your hair is washed and product-free prior to arrival. We reserve the right to decline or reschedule services.
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
          }}>3. E-Commerce & Physical Products</h2>
          <p>
            Handcrafted beadwork is subject to availability. Prices are subject to change without notice. 
            We reserve the right to refuse any order.
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
          }}>4. Third-Party Content</h2>
          <p>
            Our website may display content hosted by third-party platforms (e.g., TikTok). 
            We are not responsible for the accuracy or availability of external content.
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
          }}>5. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us via our official WhatsApp line.
          </p>
        </section>
      </div>
    </div>
  )
}

export default TermsOfService
