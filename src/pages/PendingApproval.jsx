import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { user, profile, loading, roleLoading, signOut } = useAuth()

  if (loading || roleLoading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile && profile.approved) {
    return <Navigate to="/buyers" replace />
  }

  async function handleLogOut() {
    await signOut()
    window.location.href = '/login'
  }

  const isDeclined = profile?.role === 'declined' || profile?.declined === true

  return (
    <div className="pending-page">
      {isDeclined ? (
        <>
          <h1>Access Revoked</h1>
          <p>Your access to the Based in Billings RE Investors portal has been revoked by an admin.</p>
          <p>If you believe this was a mistake, please contact an admin directly.</p>
        </>
      ) : (
        <>
          <h1>Pending Approval</h1>
          <p>Your account has been created but is waiting for admin approval.</p>
          <p>You'll be able to access the site once an admin approves your membership.</p>
        </>
      )}
      <button onClick={handleLogOut} className="btn btn-secondary">Log Out</button>
    </div>
  )
}
