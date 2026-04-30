function Footer() {
  return (
    <footer>
      <span className="logo">
        Knot Just<span style={{ color: 'var(--salon-accent)' }}>.</span>
      </span>
      <p>
        Always do you but let me do your hair 🌸 Home-based and mobile braider 📍
        Kasarani (Available for housecalls).
      </p>
      <div className="social-icons" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        <a href="https://www.instagram.com/knot.just.braids_" target="_blank" rel="noopener noreferrer">
          <img src="/instagram-logo-facebook-2-svgrepo-com.svg" alt="Instagram" width="24" height="24" />
        </a>
        <a href="https://wa.me/254797343855?text=Hi!%20I'm%20reaching%20out%20from%20the%20Knot%20Just%20website." target="_blank" rel="noopener noreferrer">
          <img src="/whatsapp-svgrepo-com.svg" alt="WhatsApp" width="24" height="24" />
        </a>
        <a href="https://www.tiktok.com/@knot.justbraids" target="_blank" rel="noopener noreferrer">
          <img src="/tiktok-svgrepo-com (2).svg" alt="TikTok" width="24" height="24" />
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer">
          <img src="/snapchat-svgrepo-com.svg" alt="Snapchat" width="24" height="24" />
        </a>
      </div>
    </footer>
  )
}

export default Footer
