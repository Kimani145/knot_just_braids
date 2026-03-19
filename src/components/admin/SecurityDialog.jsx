import { useState } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { auth } from '../../firebase'

const normalizeSecurityError = (error) => {
  if (!error?.code) {
    return 'Unable to update the password right now.'
  }

  if (
    error.code === 'auth/wrong-password' ||
    error.code === 'auth/invalid-credential'
  ) {
    return 'Incorrect current password.'
  }

  if (error.code === 'auth/weak-password') {
    return 'Your new password is too weak. Use at least 6 characters.'
  }

  if (error.code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a moment and try again.'
  }

  return 'Unable to update the password right now.'
}

function SecurityDialog({ isOpen, onClose, userEmail = '' }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setError('')
    setSuccessMessage('')
    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const user = auth.currentUser
    const email = user?.email || userEmail

    if (!user || !email) {
      setError('No authenticated admin session was found.')
      return
    }

    if (!currentPassword || !newPassword) {
      setError('Enter both your current password and a new password.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const credential = EmailAuthProvider.credential(email, currentPassword)

      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)

      setCurrentPassword('')
      setNewPassword('')
      setSuccessMessage('Password updated successfully.')
    } catch (securityError) {
      console.error('Password change failed:', securityError)
      setError(normalizeSecurityError(securityError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`}>
      <div className="sheet security-sheet">
        <div className="sheet-header">
          <h2>Account Security</h2>
          <button className="close-btn" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="note">
            Signed in as <strong>{userEmail || 'admin user'}</strong>
          </div>

          <div className="fg">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="fg">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
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

          <div className="security-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>

            <button className="btn btn-outline" type="button" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SecurityDialog
