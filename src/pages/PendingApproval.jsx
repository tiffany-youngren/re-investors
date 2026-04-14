import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in — redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Already approved — send them to buyers
  if (profile && profile.approved) {
    return <Navigate to="/buyers" replace />
  }

  async function handleLogOut() {
    await signOut()
    // Hard redirect to clear all state reliably
    window.location.href = '/'
  }

  return (
    <div className="pending-page">
      <h1>Pending Approval</h1>
      <p>Your account has been created but is waiting for admin approval.</p>
      <p>You'll be able to access the site once an admin approves your membership.</p>
      <button onClick={handleLogOut} className="btn btn-secondary">Log Out</button>
    </div>
  )
}
