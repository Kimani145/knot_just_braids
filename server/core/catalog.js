/**
 * server/core/catalog.js
 * Catalog querying and retrieval logic.
 * Host-agnostic: pure JavaScript, zero external dependencies.
 */

/**
 * Fetch all available salon styles and bead products from the store.
 * @param {import('./store.js').Store} store
 */
export async function fetchFullCatalog(store) {
  const [salonStyles, beadProducts] = await Promise.all([
    store.listSalonStyles(),
    store.listBeadProducts(),
  ])

  return {
    salonStyles: salonStyles || [],
    beadProducts: beadProducts || [],
  }
}
