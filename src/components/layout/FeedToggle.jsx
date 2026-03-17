import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

function FeedToggle({ activeFeed, onChange }) {
  const sliderRef = useRef(null)
  const salonRef = useRef(null)
  const beadsRef = useRef(null)

  const updateSlider = useCallback(() => {
    const slider = sliderRef.current
    const salon = salonRef.current
    const beads = beadsRef.current

    if (!slider || !salon || !beads) return

    if (activeFeed === 'salon') {
      slider.style.width = `${salon.offsetWidth}px`
      slider.style.left = '4px'
      return
    }

    slider.style.width = `${beads.offsetWidth}px`
    slider.style.left = `${salon.offsetWidth + 4}px`
  }, [activeFeed])

  useLayoutEffect(() => {
    updateSlider()
  }, [updateSlider])

  useEffect(() => {
    window.addEventListener('resize', updateSlider)
    return () => window.removeEventListener('resize', updateSlider)
  }, [updateSlider])

  return (
    <div className="feed-toggle-wrap">
      <div className="feed-toggle">
        <div className="feed-toggle-slider" ref={sliderRef} />
        <button
          ref={salonRef}
          className={`feed-pill${activeFeed === 'salon' ? ' active' : ''}`}
          onClick={() => onChange('salon')}
        >
          💇 Hair Salon
        </button>
        <button
          ref={beadsRef}
          className={`feed-pill${activeFeed === 'beads' ? ' active' : ''}`}
          onClick={() => onChange('beads')}
        >
          📿 Beadwork Shop
        </button>
      </div>
    </div>
  )
}

export default FeedToggle
