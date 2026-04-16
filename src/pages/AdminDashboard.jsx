import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { displayPhone } from '../lib/utils'

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function apiFetch(url, options = {}) {
  const token = await getAuthToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  return res.json()
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [buyBoxes, setBuyBoxes] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingProps, setLoadingProps] = useState(true)
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [error, setError] = useState('')
  const [actionInProgress, setActionInProgress] = useState('')

  async function fetchUsers() {
    setLoadingUsers(true)
    const data = await apiFetch('/api/admin-users')
    if (Array.isArray(data)) {
      setUsers(data)
    } else {
      setError(data.error || 'Failed to load users')
    }
    setLoadingUsers(false)
  }

  async function fetchProperties() {
    setLoadingProps(true)
    const data = await apiFetch('/api/admin-properties')
    if (Array.isArray(data)) {
      setProperties(data)
    } else {
      setError(data.error || 'Failed to load properties')
    }
    setLoadingProps(false)
  }

  async function fetchBuyBoxes() {
    setLoadingBoxes(true)
    const data = await apiFetch('/api/admin-buyboxes')
    if (Array.isArray(data)) {
      setBuyBoxes(data)
    } else {
      setError(data.error || 'Failed to load buy boxes')
    }
    setLoadingBoxes(false)
  }

  useEffect(() => {
    fetchUsers()
    fetchProperties()
    fetchBuyBoxes()
  }, [])

  // User actions
  async function approveUser(profileId) {
    setActionInProgress(`approve-${profileId}`)
    await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({ profileId, approved: true, role: 'member' }),
    })
    await fetchUsers()
    setActionInProgress('')
  }

  async function denyUser(userId) {
    if (!window.confirm('This will permanently delete this user. Continue?')) return
    setActionInProgress(`deny-${userId}`)
    await apiFetch('/api/admin-users', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
    await fetchUsers()
    setActionInProgress('')
  }

  async function revokeApproval(profileId) {
    if (!window.confirm('Revoke this user\'s access?')) return
    setActionInProgress(`revoke-${profileId}`)
    await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({ profileId, approved: false, role: 'visitor' }),
    })
    await fetchUsers()
    setActionInProgress('')
  }

  async function changeRole(profileId, newRole) {
    setActionInProgress(`role-${profileId}`)
    await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({ profileId, role: newRole }),
    })
    await fetchUsers()
    setActionInProgress('')
  }

  // Property actions
  async function approveProperty(propertyId) {
    setActionInProgress(`approve-prop-${propertyId}`)
    await apiFetch('/api/admin-properties', {
      method: 'POST',
      body: JSON.stringify({ propertyId, approved: true }),
    })
    await fetchProperties()
    setActionInProgress('')
  }

  async function removeProperty(propertyId) {
    if (!window.confirm('Permanently remove this listing and its images?')) return
    setActionInProgress(`remove-prop-${propertyId}`)
    await apiFetch('/api/admin-properties', {
      method: 'DELETE',
      body: JSON.stringify({ propertyId }),
    })
    await fetchProperties()
    setActionInProgress('')
  }

  // Buy box actions
  async function approveBuyBox(buyBoxId) {
    setActionInProgress(`approve-bb-${buyBoxId}`)
    await apiFetch('/api/admin-buyboxes', {
      method: 'POST',
      body: JSON.stringify({ buyBoxId, approved: true }),
    })
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  async function denyBuyBox(buyBoxId) {
    if (!window.confirm('Deny and remove this buy box?')) return
    setActionInProgress(`deny-bb-${buyBoxId}`)
    await apiFetch('/api/admin-buyboxes', {
      method: 'DELETE',
      body: JSON.stringify({ buyBoxId }),
    })
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  async function unapproveBuyBox(buyBoxId) {
    if (!window.confirm('Move this buy box back to pending?')) return
    setActionInProgress(`unapprove-bb-${buyBoxId}`)
    await apiFetch('/api/admin-buyboxes', {
      method: 'POST',
      body: JSON.stringify({ buyBoxId, approved: false }),
    })
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  const pendingUsers = users.filter((u) => !u.approved)
  const approvedUsers = users.filter((u) => u.approved)
  const pendingBoxes = buyBoxes.filter((b) => !b.approved)
  const approvedBoxes = buyBoxes.filter((b) => b.approved)

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      {error && <p className="error-msg">{error}</p>}

      {/* ---- USER MANAGEMENT ---- */}
      <section className="admin-section">
        <h2>Pending Approvals ({pendingUsers.length})</h2>
        {loadingUsers && <p>Loading users...</p>}
        {!loadingUsers && pendingUsers.length === 0 && (
          <p className="admin-empty">No pending users.</p>
        )}
        {pendingUsers.map((u) => (
          <div key={u.id} className="admin-card">
            <div className="admin-card-info">
              <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || 'No name'}</strong>
              <span>{u.email}</span>
              {u.phone && <span>{displayPhone(u.phone, u.phone_country_code)}</span>}
              <span className="admin-badge badge-pending">Pending</span>
            </div>
            <div className="admin-card-actions">
              <button
                className="btn btn-sm"
                onClick={() => approveUser(u.id)}
                disabled={actionInProgress === `approve-${u.id}`}
              >
                {actionInProgress === `approve-${u.id}` ? '...' : 'Approve'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => denyUser(u.user_id)}
                disabled={actionInProgress === `deny-${u.user_id}`}
              >
                {actionInProgress === `deny-${u.user_id}` ? '...' : 'Deny'}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Approved Users ({approvedUsers.length})</h2>
        {!loadingUsers && approvedUsers.length === 0 && (
          <p className="admin-empty">No approved users yet.</p>
        )}
        {approvedUsers.map((u) => (
          <div key={u.id} className="admin-card">
            <div className="admin-card-info">
              <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || 'No name'}</strong>
              <span>{u.email}</span>
              {u.phone && <span>{displayPhone(u.phone, u.phone_country_code)}</span>}
              <span>{u.license_status || 'No license info'}</span>
              {u.brokerage_name && <span>{u.brokerage_name}</span>}
              <span className={`admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                {u.role}
              </span>
            </div>
            <div className="admin-card-actions">
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                disabled={actionInProgress === `role-${u.id}`}
                className="role-select"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => revokeApproval(u.id)}
                disabled={actionInProgress === `revoke-${u.id}`}
              >
                {actionInProgress === `revoke-${u.id}` ? '...' : 'Revoke'}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ---- LISTING MANAGEMENT ---- */}
      <section className="admin-section">
        <h2>All Listings ({properties.length})</h2>
        {loadingProps && <p>Loading listings...</p>}
        {!loadingProps && properties.length === 0 && (
          <p className="admin-empty">No property listings yet.</p>
        )}
        {properties.map((p) => (
          <div key={p.id} className="admin-card">
            <div className="admin-card-info">
              <strong>{p.address}</strong>
              <span>${Number(p.price).toLocaleString()}</span>
              <span>by {[p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(' ') || p.profiles?.email || 'Unknown'}</span>
              <span className={`admin-badge ${p.approved ? 'badge-member' : 'badge-pending'}`}>
                {p.approved ? 'Approved' : 'Pending'}
              </span>
            </div>
            <div className="admin-card-actions">
              {!p.approved && (
                <button
                  className="btn btn-sm"
                  onClick={() => approveProperty(p.id)}
                  disabled={actionInProgress === `approve-prop-${p.id}`}
                >
                  {actionInProgress === `approve-prop-${p.id}` ? '...' : 'Approve'}
                </button>
              )}
              <button
                className="btn btn-sm btn-danger"
                onClick={() => removeProperty(p.id)}
                disabled={actionInProgress === `remove-prop-${p.id}`}
              >
                {actionInProgress === `remove-prop-${p.id}` ? '...' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ---- BUY BOX MANAGEMENT ---- */}
      <section className="admin-section">
        <h2>Pending Buy Boxes ({pendingBoxes.length})</h2>
        {loadingBoxes && <p>Loading buy boxes...</p>}
        {!loadingBoxes && pendingBoxes.length === 0 && (
          <p className="admin-empty">No pending buy boxes.</p>
        )}
        {pendingBoxes.map((b) => (
          <div key={b.id} className="admin-card">
            <div className="admin-card-info">
              <strong>{[b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(' ') || b.profiles?.email || 'Unknown'}</strong>
              <span>{(b.areas_looking || []).map((a) => `${a.city}, ${a.state}`).join(' · ') || 'No areas'}</span>
              <span>{(b.property_types || []).join(', ')}</span>
              {b.price_max && (
                <span>
                  {b.price_min ? `$${Number(b.price_min).toLocaleString()} – ` : 'Up to '}
                  ${Number(b.price_max).toLocaleString()}
                </span>
              )}
              <span className="admin-badge badge-pending">Pending</span>
            </div>
            <div className="admin-card-actions">
              <button
                className="btn btn-sm"
                onClick={() => approveBuyBox(b.id)}
                disabled={actionInProgress === `approve-bb-${b.id}`}
              >
                {actionInProgress === `approve-bb-${b.id}` ? '...' : 'Approve'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => denyBuyBox(b.id)}
                disabled={actionInProgress === `deny-bb-${b.id}`}
              >
                {actionInProgress === `deny-bb-${b.id}` ? '...' : 'Deny'}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Approved Buy Boxes ({approvedBoxes.length})</h2>
        {!loadingBoxes && approvedBoxes.length === 0 && (
          <p className="admin-empty">No approved buy boxes yet.</p>
        )}
        {approvedBoxes.map((b) => (
          <div key={b.id} className="admin-card">
            <div className="admin-card-info">
              <strong>{[b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(' ') || b.profiles?.email || 'Unknown'}</strong>
              <span>{(b.areas_looking || []).map((a) => `${a.city}, ${a.state}`).join(' · ') || 'No areas'}</span>
              <span>{(b.property_types || []).join(', ')}</span>
              {b.price_max && (
                <span>
                  {b.price_min ? `$${Number(b.price_min).toLocaleString()} – ` : 'Up to '}
                  ${Number(b.price_max).toLocaleString()}
                </span>
              )}
              <span className="admin-badge badge-member">Approved</span>
            </div>
            <div className="admin-card-actions">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => unapproveBuyBox(b.id)}
                disabled={actionInProgress === `unapprove-bb-${b.id}`}
              >
                {actionInProgress === `unapprove-bb-${b.id}` ? '...' : 'Unapprove'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => denyBuyBox(b.id)}
                disabled={actionInProgress === `deny-bb-${b.id}`}
              >
                {actionInProgress === `deny-bb-${b.id}` ? '...' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
