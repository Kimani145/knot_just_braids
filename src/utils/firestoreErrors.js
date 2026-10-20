/**
 * src/utils/firestoreErrors.js
 * Human-readable mapping of Firestore error codes with actionable guidance.
 * Dispatches sanitized error telemetry to Sentry.
 */

import { captureException } from './sentry.js'

export const FIRESTORE_ERROR_MESSAGES = {
  'permission-denied':
    'Signed in but not authorized; check the admin UID in the live rules.',
  'unauthenticated':
    'Session expired or not signed in. Please log in again to continue.',
  'invalid-argument':
    'Invalid data provided. Please check the form fields and try again.',
  'unavailable':
    'Firestore service is temporarily unavailable. Check your internet connection or retry.',
  'resource-exhausted':
    'Daily quota exceeded or rate limit reached. Please wait a moment.',
  'failed-precondition':
    'Operation rejected by database precondition rules.',
}

/**
 * Returns human-readable error text and actionable next step for a Firestore error.
 *
 * @param {any} error
 * @returns {string}
 */
export function formatFirestoreError(error) {
  if (!error) return 'An unknown error occurred while saving to Firestore.'

  const code = error.code ? String(error.code).toLowerCase().replace(/^firestore\//, '') : ''
  if (FIRESTORE_ERROR_MESSAGES[code]) {
    return FIRESTORE_ERROR_MESSAGES[code]
  }

  const rawMessage = typeof error.message === 'string' ? error.message : ''
  if (code) {
    return `Firestore error (${code}): ${rawMessage || 'Could not complete database write.'}`
  }

  return rawMessage || 'Could not save changes to Firestore. Please retry.'
}

/**
 * Reports a Firestore error to Sentry with scrubbed error code and context,
 * then returns the user-facing message.
 *
 * @param {any} error
 * @param {string} [operation='write']
 * @returns {string} Formatted error message
 */
export function reportAdminFirestoreError(error, operation = 'write') {
  const code = error?.code ? String(error.code) : 'unknown'
  const message = formatFirestoreError(error)

  try {
    captureException(error, {
      tags: {
        layer: 'admin_firestore',
        operation,
        errorCode: code,
      },
      extra: {
        errorCode: code,
        operation,
      },
    })
  } catch {
    // Sentry capture failure must never crash the UI
  }

  return message
}
