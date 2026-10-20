/**
 * src/utils/duration.js
 * Pure duration formatter for salon styling services.
 *
 * Handles:
 *  - Raw numbers: "4" -> "4 hrs", 1 -> "1 hr", "2.5" -> "2.5 hrs"
 *  - Existing ranges: "5-7 hrs" -> "5–7 hrs", "5–7 hrs" -> "5–7 hrs"
 *  - Numeric ranges: "3-4" -> "3–4 hrs", "5–7" -> "5–7 hrs"
 *  - Units preserved: "45 mins" -> "45 mins"
 *  - Nullish / empty / dashes: "—", "-", "", null, undefined -> ""
 *
 * @param {string|number|null|undefined} raw
 * @returns {string} Formatted duration string or empty string
 */
export function formatDuration(raw) {
  if (raw === null || raw === undefined) return ''

  const str = String(raw).trim()
  if (!str || str === '—' || str === '-' || str === '--') {
    return ''
  }

  // If already suffixed with hour/minute unit
  if (/(?:hr|hour|min)s?\b/i.test(str)) {
    // Normalize standard hyphen to en-dash in ranges
    return str.replace(/(\d+)\s*-\s*(\d+)/g, '$1–$2')
  }

  // Pure numeric range: "5-7" or "5–7"
  const rangeMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:-|–)\s*(\d+(?:\.\d+)?)$/)
  if (rangeMatch) {
    return `${rangeMatch[1]}–${rangeMatch[2]} hrs`
  }

  // Pure single number: "4" or 4
  const numMatch = str.match(/^(\d+(?:\.\d+)?)$/)
  if (numMatch) {
    const val = Number(numMatch[1])
    return val === 1 ? '1 hr' : `${val} hrs`
  }

  return str
}
