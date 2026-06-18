import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { user, profile, loading, roleLoading, signOut } = useAuth()

  if (loading || roleLoading) {
    return <div className="loading">Loading...</div>
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Already approved → straight to the member portal
  if (profile && profile.approved) {
    return <Navigate to="/buyers" replace />
  }

  async function handleLogOut() {
    await signOut()
    window.location.href = '/login'
  }

  const isDeclined = profile?.role === 'declined' || profile?.declined === true
  const applicationStarted = !!(profile?.first_name && profile?.last_name && profile?.phone)

  return (
    <div className="pending-page">
      {isDeclined ? (
        <>
          <h1>Access Revoked</h1>
          <p>Your access to the Based in Billings RE Investors portal has been revoked by an admin.</p>
          <p>If you believe this was a mistake, please contact an admin directly.</p>
          <button onClick={handleLogOut} className="btn btn-secondary">Log Out</button>
        </>
      ) : applicationStarted ? (
        <>
          <h1>Application Received</h1>
          <p>Thank you for applying. Admin will review your application and verify your meetup
          attendance before approving your membership.</p>
          <p>You can update your application any time.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/profile" className="btn">View / Update Application</Link>
            <button onClick={handleLogOut} className="btn btn-secondary">Log Out</button>
          </div>
        </>
      ) : (
        <>
          <h1>Complete Your Application</h1>
          <p>Welcome! To finish creating your account, please complete the membership application.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/profile?welcome=1" className="btn">Complete Application</Link>
            <button onClick={handleLogOut} className="btn btn-secondary">Log Out</button>
          </div>
        </>
      )}
    </div>
  )
}
