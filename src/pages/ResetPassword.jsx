import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase sends the user here with a recovery token in the URL hash.
    // The onAuthStateChange listener in AuthContext picks up the session
    // automatically. We just need to wait for the PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if we already have a session (user clicked link and session is active)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    }

    setSubmitting(false)
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <Link to="/" className="back-link">&larr; Back to Home</Link>
        <div className="auth-card">
          <h1>Reset Password</h1>
          <p>Loading... If this takes too long, your reset link may have expired.</p>
          <p className="toggle-msg">
            <Link to="/login" className="toggle-btn">Back to Log In</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link">&larr; Back to Home</Link>
      <div className="auth-card">
        <h1>Set New Password</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="error-msg">{error}</p>}
          {message && <p className="success-msg">{message}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
