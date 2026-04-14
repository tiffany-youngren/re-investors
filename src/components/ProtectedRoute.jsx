import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin }) {
  const { user, profile, profileError, loading, roleLoading, refreshProfile } = useAuth()

  // Show spinner while auth or profile is loading
  if (loading || roleLoading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in — go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Profile query failed — show retry, don't redirect to pending
  if (profileError && !profile) {
    return (
      <div className="loading">
        <p>Having trouble loading your profile.</p>
        <button onClick={refreshProfile} className="btn">Try Again</button>
      </div>
    )
  }

  // Profile loaded successfully and not approved — go to pending
  if (profile && !profile.approved) {
    return <Navigate to="/pending" replace />
  }

  // Profile not loaded yet (null, no error) — still loading
  if (!profile) {
    return <div className="loading">Loading profile...</div>
  }

  // Trying to access admin without admin role — go to home
  if (requireAdmin && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
