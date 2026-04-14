import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in — go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but no profile yet or not approved — go to pending
  if (!profile || !profile.approved) {
    return <Navigate to="/pending" replace />
  }

  // Trying to access admin without admin role — go to home
  if (requireAdmin && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
