function HeroStrip({ activeFeed, onPrimaryAction }) {
  const isSalon = activeFeed === 'salon'
  const copy = isSalon
    ? {
        label: '✦ Home Salon Experience',
        emphasis: 'effortlessly booked.',
        sub:
          'Browse handcrafted styles, pick your time, and get confirmed — no DMs needed.',
        action: 'View Styles',
      }
    : {
        label: '✦ Handmade Beadwork Shop',
        emphasis: 'wear your culture.',
        sub:
          'Browse handcrafted African beadwork. Add to cart and order directly — fast delivery.',
        action: 'Shop Now',
      }

  return (
    <div className="hero-strip" id="heroStrip">
      <div>
        <div className="section-label" id="heroLabel">
          {copy.label}
        </div>
        <h1 id="heroTitle">
          Your style,
          <br />
          <em id="heroEm">{copy.emphasis}</em>
        </h1>
        <p id="heroSub">{copy.sub}</p>
      </div>
      <div className="hero-actions">
        <button
          className="btn btn-primary"
          id="heroAction"
          type="button"
          onClick={onPrimaryAction}
        >
          {copy.action}
        </button>
        <a
          className="btn btn-outline"
          href="https://wa.me/254797343855?text=Hi!%20I'm%20reaching%20out%20from%20the%20Knot%20Just%20website."
          target="_blank"
          rel="noreferrer"
        >
        <img src="/whatsapp-svgrepo-com.svg" alt="WhatsApp" width="24" height="24" />  WhatsApp
        </a>
      </div>
    </div>
  )
}

export default HeroStrip
