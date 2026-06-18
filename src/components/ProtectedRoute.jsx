import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route gate for authenticated pages.
 *
 * Props:
 *  - requireAdmin: only allow profile.role === 'admin'
 *  - requireMember: only allow members + admins (blocks visitors)
 *  - allowPending: allow users with profile.approved === false (used by /profile so
 *    new applicants can fill out their application without being bounced to /pending)
 */
export default function ProtectedRoute({ children, requireAdmin, requireMember, allowPending }) {
  const { user, profile, profileError, loading, roleLoading, refreshProfile } = useAuth()

  // Show spinner while auth or profile is loading
  if (loading || roleLoading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in — go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Profile query failed — show retry, don't redirect
  if (profileError && !profile) {
    return (
      <div className="loading">
        <p>Having trouble loading your profile.</p>
        <button onClick={refreshProfile} className="btn">Try Again</button>
      </div>
    )
  }

  // Profile not loaded yet (null, no error) — still loading
  if (!profile) {
    return <div className="loading">Loading profile...</div>
  }

  // Not approved
  //   - If this route allows pending users (e.g., /profile), let them through
  //   - Otherwise send them to /pending
  if (!profile.approved && !allowPending) {
    return <Navigate to="/pending" replace />
  }

  // Admin-only route check
  if (requireAdmin && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // Member-only route check (visitors blocked)
  if (requireMember && profile.role !== 'member' && profile.role !== 'admin') {
    return <Navigate to="/profile?upgrade=1" replace />
  }

  return children
}
