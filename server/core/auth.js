/**
 * server/core/auth.js
 * Host-agnostic authentication and admin authorization helpers.
 * Pure JavaScript, zero external dependencies.
 */

import { ForbiddenError, UnauthorizedError } from './errors.js'

/**
 * Extract bearer token from Authorization header.
 * @param {string|null|undefined} authHeader
 * @returns {string} token
 */
export function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    throw new UnauthorizedError('Missing Authorization header')
  }

  const parts = authHeader.trim().split(/\s+/)
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new UnauthorizedError('Malformed Authorization header. Format: Bearer <token>')
  }

  return parts[1]
}

/**
 * Verify an admin request against an allowlist of admin UIDs.
 * @param {string|null|undefined} authHeader
 * @param {Function} tokenVerifier - async (token) => { uid: string }
 * @param {Array<string>} adminUids - array of allowed admin UIDs
 * @returns {Promise<{ uid: string, isAdmin: true }>}
 */
export async function assertAdmin(authHeader, tokenVerifier, adminUids = []) {
  const token = extractBearerToken(authHeader)

  let decoded
  try {
    decoded = await tokenVerifier(token)
  } catch (err) {
    throw new UnauthorizedError(`Invalid or expired token: ${err.message}`)
  }

  if (!decoded || !decoded.uid) {
    throw new UnauthorizedError('Token does not contain a valid user ID')
  }

  const isAllowed = adminUids.length > 0 && adminUids.includes(decoded.uid)
  if (!isAllowed) {
    throw new ForbiddenError('User is not authorized as an administrator')
  }

  return {
    uid: decoded.uid,
    isAdmin: true,
  }
}
