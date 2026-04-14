import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { signOut } = useAuth()

  return (
    <div className="pending-page">
      <h1>Pending Approval</h1>
      <p>Your account has been created but is waiting for admin approval.</p>
      <p>You'll be able to access the site once an admin approves your membership.</p>
      <button onClick={signOut} className="btn btn-secondary">Log Out</button>
    </div>
  )
}
