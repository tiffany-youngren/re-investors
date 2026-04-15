import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') || 'login') // login, signup, forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, profile, loading, signIn } = useAuth()
  const navigate = useNavigate()

  // If already logged in and approved, redirect to For Sale
  if (!loading && user && profile?.approved) {
    return <Navigate to="/buyers" replace />
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setMessage('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = await signIn(email, password)
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.')
      } else if (error.message === 'Email not confirmed') {
        setError('Your email is not confirmed yet. Please check your inbox or try signing up again.')
      } else {
        setError(error.message)
      }
    } else {
      navigate('/buyers')
    }

    setSubmitting(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    // Sign up the user
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    // Auto-confirm the user via our API route
    if (data.user) {
      const confirmRes = await fetch('/api/auto-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      })

      if (!confirmRes.ok) {
        const { error: confirmError } = await confirmRes.json()
        setError(confirmError || 'Failed to confirm account. Please try logging in.')
        setSubmitting(false)
        return
      }

      // Now sign them in automatically
      const { error: loginError } = await signIn(email, password)
      if (loginError) {
        setError('Account created! Please log in with your email and password.')
        setMode('login')
      } else {
        navigate('/buyers')
      }
    }

    setSubmitting(false)
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a password reset link.')
    }

    setSubmitting(false)
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link">&larr; Back to Home</Link>
      <div className="auth-card">

        {/* LOGIN */}
        {mode === 'login' && (
          <>
            <h1>Log In</h1>
            <form onSubmit={handleLogin}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <p className="error-msg">{error}</p>}
              {message && <p className="success-msg">{message}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Please wait...' : 'Log In'}
              </button>
            </form>
            <p className="toggle-msg">
              <button type="button" className="toggle-btn" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </p>
            <p className="toggle-msg">
              Don't have an account?{' '}
              <button type="button" className="toggle-btn" onClick={() => switchMode('signup')}>
                Sign Up
              </button>
            </p>
          </>
        )}

        {/* SIGN UP */}
        {mode === 'signup' && (
          <>
            <h1>Sign Up</h1>
            <form onSubmit={handleSignUp}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <p className="error-msg">{error}</p>}
              {message && <p className="success-msg">{message}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
            <p className="toggle-msg">
              Already have an account?{' '}
              <button type="button" className="toggle-btn" onClick={() => switchMode('login')}>
                Log In
              </button>
            </p>
          </>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <>
            <h1>Reset Password</h1>
            <p>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleForgotPassword}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="error-msg">{error}</p>}
              {message && <p className="success-msg">{message}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="toggle-msg">
              <button type="button" className="toggle-btn" onClick={() => switchMode('login')}>
                Back to Log In
              </button>
            </p>
          </>
        )}

      </div>
    </div>
  )
}
