function PolicyModal({ isOpen, onClose }) {
  return (
    <div className={`overlay policy-overlay${isOpen ? ' open' : ''}`}>
      <div className="sheet policy-sheet">
        <div className="sheet-header">
          <h2>Booking & Shop Policies</h2>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="policy-stack">
          <section className="policy-section">
            <p className="policy-kicker">Knot Just Braids Policy</p>
            <ul className="policy-list">
              <li>A deposit is required to secure every braiding appointment.</li>
              <li>A strict 15-minute late grace period is enforced.</li>
              <li>Hair must arrive washed, dried, and free of product buildup.</li>
            </ul>
          </section>

          <section className="policy-section">
            <p className="policy-kicker">Knot Just Beads Policy</p>
            <ul className="policy-list">
              <li>Orders require a 2-3 day processing window before handoff.</li>
              <li>No returns or exchanges are accepted for hygiene reasons.</li>
              <li>Pickup or delivery details are arranged after purchase.</li>
            </ul>
          </section>
        </div>

        <button
          className="btn btn-primary btn-full policy-close-btn"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default PolicyModal
