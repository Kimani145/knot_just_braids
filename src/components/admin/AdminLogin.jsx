import { useState } from 'react'
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../../firebase'

function AdminLogin({ isCheckingSession = false, onBackToStore }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Enter your admin email and password.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setPassword('')
    } catch (authError) {
      console.error('Admin login failed:', authError)
      setError('Unable to sign in. Check your email and password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    const resetEmail = email.trim() || window.prompt('Enter your admin email')

    if (!resetEmail) {
      return
    }

    setIsResetting(true)
    setError('')
    setSuccessMessage('')

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setEmail(resetEmail)
      setSuccessMessage('Password reset sent. Check your inbox for the reset link.')
    } catch (resetError) {
      console.error('Password reset failed:', resetError)
      setError('Could not send the reset email. Confirm the address and try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <div className="admin-auth-copy">
          <p className="admin-auth-kicker">Secure Admin Access</p>
          <h2>Knot Just Command Center</h2>
          <p>
            Sign in with your Admin account to manage styles,
            products, and gallery assets.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleLogin}>
          <div className="fg">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@knotjust.com"
              autoComplete="email"
            />
          </div>

          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <p className="admin-auth-feedback admin-auth-feedback-error">{error}</p>
          ) : null}

          {successMessage ? (
            <p className="admin-auth-feedback admin-auth-feedback-success">
              {successMessage}
            </p>
          ) : null}

          {isCheckingSession ? (
            <p className="admin-auth-note">Checking secure session...</p>
          ) : null}

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={isSubmitting || isCheckingSession}
          >
            {isSubmitting ? 'Signing In...' : 'Login to Command Center'}
          </button>
        </form>

        <div className="admin-auth-actions">
          <button
            className="admin-auth-link"
            type="button"
            onClick={handlePasswordReset}
            disabled={isResetting || isSubmitting}
          >
            {isResetting ? 'Sending reset...' : 'Forgot Password?'}
          </button>

          <button
            className="admin-auth-link"
            type="button"
            onClick={onBackToStore}
          >
            Back to Store
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
