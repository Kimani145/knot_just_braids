/**
 * server/adapters/authAdapter.js
 * Admin authentication adapter using Firebase Admin Auth.
 */

import admin from 'firebase-admin'
import { assertAdmin } from '../core/auth.js'
import { getFirebaseAdminApp } from './firestoreStore.js'

/**
 * Verify administrator identity from incoming request Authorization header.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<{ uid: string, isAdmin: true }>}
 */
export async function requireAdmin(req) {
  const authHeader = req.headers.authorization

  const adminUids = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean)

  const tokenVerifier = async (token) => {
    if (process.env.USE_MOCK_AUTH === 'true') {
      if (token.startsWith('mock_admin_')) {
        return { uid: token.replace('mock_', '') }
      }
    }
    const app = getFirebaseAdminApp()
    return await admin.auth(app).verifyIdToken(token)
  }

  return await assertAdmin(authHeader, tokenVerifier, adminUids)
}
