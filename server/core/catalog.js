/**
 * server/core/catalog.js
 * Catalog querying and retrieval logic.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

/**
 * Predicate to determine if a catalog item is visible to the public.
 * Draft items are strictly hidden from customers across all storefront channels.
 * Legacy documents without a status field are considered published.
 *
 * @param {object} item
 * @returns {boolean}
 */
export function isPubliclyVisible(item) {
  if (!item || typeof item !== 'object') return false
  if (item.status === 'draft') return false
  // Absent, undefined, or null status defaults to published (legacy documents)
  if (item.status === undefined || item.status === null || item.status === '') {
    return true
  }
  return item.status === 'published'
}

/**
 * Fetch all available salon styles and bead products from the store.
 * Filters out unpublished drafts before returning to customer endpoints.
 * @param {import('./store.js').Store} store
 */
export async function fetchFullCatalog(store) {
  const [salonStyles, beadProducts] = await Promise.all([
    store.listSalonStyles(),
    store.listBeadProducts(),
  ])

  return {
    salonStyles: (salonStyles || []).filter(isPubliclyVisible),
    beadProducts: (beadProducts || []).filter(isPubliclyVisible),
  }
}
