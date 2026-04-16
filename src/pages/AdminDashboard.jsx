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

// Helper: run an admin action, surface any error as an alert.
async function runAdminAction(url, body, method = 'POST') {
  try {
    const result = await apiFetch(url, { method, body: JSON.stringify(body) })
    if (result?.error) {
      alert(`Action failed: ${result.error}`)
      console.error('admin action failed:', url, body, result)
      return null
    }
    return result
  } catch (e) {
    alert(`Network error: ${e?.message || 'Unknown error'}`)
    console.error('admin action threw:', url, body, e)
    return null
  }
}

const USER_FILTERS = ['all', 'members', 'visitors', 'pending', 'declined']
const PROPERTY_FILTERS = ['all', 'active', 'draft', 'flagged', 'expired']
const BUY_BOX_FILTERS = ['all', 'pending', 'approved']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const [userFilter, setUserFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [buyBoxFilter, setBuyBoxFilter] = useState('all')

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
    if (Array.isArray(data)) setUsers(data)
    else setError(data.error || 'Failed to load users')
    setLoadingUsers(false)
  }

  async function fetchProperties() {
    setLoadingProps(true)
    const data = await apiFetch('/api/admin-properties')
    if (Array.isArray(data)) setProperties(data)
    else setError(data.error || 'Failed to load properties')
    setLoadingProps(false)
  }

  async function fetchBuyBoxes() {
    setLoadingBoxes(true)
    const data = await apiFetch('/api/admin-buyboxes')
    if (Array.isArray(data)) setBuyBoxes(data)
    else setError(data.error || 'Failed to load buy boxes')
    setLoadingBoxes(false)
  }

  useEffect(() => {
    fetchUsers()
    fetchProperties()
    fetchBuyBoxes()
  }, [])

  // ---------- USER ACTIONS ----------
  async function approveUser(profileId) {
    setActionInProgress(`approve-${profileId}`)
    await runAdminAction('/api/admin-users', { profileId, approved: true, role: 'member' })
    await fetchUsers()
    setActionInProgress('')
  }

  async function makeVisitor(profileId) {
    setActionInProgress(`visitor-${profileId}`)
    await runAdminAction('/api/admin-users', { profileId, approved: true, role: 'visitor' })
    await fetchUsers()
    setActionInProgress('')
  }

  async function denyUser(userId) {
    if (!window.confirm('This will permanently delete this user. Continue?')) return
    setActionInProgress(`deny-${userId}`)
    await runAdminAction('/api/admin-users', { userId }, 'DELETE')
    await fetchUsers()
    setActionInProgress('')
  }

  async function revokeApproval(profileId) {
    if (!window.confirm('Revoke this user\'s access? They will be marked as Declined.')) return
    setActionInProgress(`revoke-${profileId}`)
    await runAdminAction('/api/admin-users', {
      profileId, approved: false, role: 'visitor', declined: true,
    })
    await fetchUsers()
    setActionInProgress('')
  }

  async function deleteUser(userId) {
    if (!window.confirm('This will permanently delete this user and all their data. They can create a new account in the future. Continue?')) return
    setActionInProgress(`delete-${userId}`)
    await runAdminAction('/api/admin-users', { userId }, 'DELETE')
    await fetchUsers()
    setActionInProgress('')
  }

  async function changeRole(profileId, newRole) {
    setActionInProgress(`role-${profileId}`)
    await runAdminAction('/api/admin-users', { profileId, role: newRole })
    await fetchUsers()
    setActionInProgress('')
  }

  // ---------- PROPERTY ACTIONS ----------
  async function approveProperty(propertyId) {
    setActionInProgress(`approve-prop-${propertyId}`)
    await apiFetch('/api/admin-properties', {
      method: 'POST',
      body: JSON.stringify({ propertyId, approved: true }),
    })
    await fetchProperties()
    setActionInProgress('')
  }

  async function flagProperty(propertyId) {
    const reason = window.prompt('Why are you flagging this listing? The member will see this reason on their Profile page.', '')
    if (reason === null) return
    if (!reason.trim()) { alert('A reason is required.'); return }
    setActionInProgress(`flag-prop-${propertyId}`)
    await runAdminAction('/api/admin-properties', { propertyId, flagged: true, flagReason: reason.trim() })
    await fetchProperties()
    setActionInProgress('')
  }

  async function unflagProperty(propertyId) {
    setActionInProgress(`unflag-prop-${propertyId}`)
    await runAdminAction('/api/admin-properties', { propertyId, approved: true })
    await fetchProperties()
    setActionInProgress('')
  }

  async function removeProperty(propertyId) {
    if (!window.confirm('Permanently remove this listing and its images?')) return
    setActionInProgress(`remove-prop-${propertyId}`)
    await runAdminAction('/api/admin-properties', { propertyId }, 'DELETE')
    await fetchProperties()
    setActionInProgress('')
  }

  // ---------- BUY BOX ACTIONS ----------
  async function approveBuyBox(buyBoxId) {
    setActionInProgress(`approve-bb-${buyBoxId}`)
    await runAdminAction('/api/admin-buyboxes', { buyBoxId, approved: true })
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  async function denyBuyBox(buyBoxId) {
    if (!window.confirm('Deny and remove this buy box?')) return
    setActionInProgress(`deny-bb-${buyBoxId}`)
    await runAdminAction('/api/admin-buyboxes', { buyBoxId }, 'DELETE')
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  async function flagBuyBox(buyBoxId) {
    const reason = window.prompt('Why are you flagging this buy box? The member will see this reason on their Profile page.', '')
    if (reason === null) return
    if (!reason.trim()) { alert('A reason is required.'); return }
    setActionInProgress(`flag-bb-${buyBoxId}`)
    await runAdminAction('/api/admin-buyboxes', { buyBoxId, flagged: true, flagReason: reason.trim() })
    await fetchBuyBoxes()
    setActionInProgress('')
  }

  // ---------- FILTERED DATA ----------
  const filteredUsers = users.filter((u) => {
    if (userFilter === 'all') return true
    if (userFilter === 'members') return u.approved && u.role === 'member'
    if (userFilter === 'visitors') return u.approved && u.role === 'visitor'
    if (userFilter === 'pending') return !u.approved && !u.declined
    if (userFilter === 'declined') return !u.approved && u.declined === true
    return true
  })

  const filteredProperties = properties.filter((p) => {
    if (propertyFilter === 'all') return true
    return p.status === propertyFilter
  })

  const filteredBuyBoxes = buyBoxes.filter((b) => {
    if (buyBoxFilter === 'all') return true
    if (buyBoxFilter === 'pending') return !b.approved
    if (buyBoxFilter === 'approved') return b.approved
    return true
  })

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      {error && <p className="error-msg">{error}</p>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${activeTab === 'users' ? ' active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'properties' ? ' active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          Properties ({properties.length})
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'buyboxes' ? ' active' : ''}`}
          onClick={() => setActiveTab('buyboxes')}
        >
          Buy Boxes ({buyBoxes.length})
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <section className="admin-section">
          <div className="admin-filters">
            {USER_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-pill${userFilter === f ? ' active' : ''}`}
                onClick={() => setUserFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loadingUsers && <p>Loading users...</p>}
          {!loadingUsers && filteredUsers.length === 0 && (
            <p className="admin-empty">No users in this filter.</p>
          )}

          {filteredUsers.map((u) => (
            <div key={u.id} className="admin-card">
              <div className="admin-card-info">
                <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || 'No name'}</strong>
                <span>{u.email}</span>
                {u.phone && <span>{displayPhone(u.phone, u.phone_country_code)}</span>}
                {u.license_status && <span>{u.license_status}</span>}
                {u.brokerage_name && <span>{u.brokerage_name}</span>}
                {u.approved
                  ? <span className={`admin-badge ${u.role === 'admin' ? 'badge-admin' : u.role === 'member' ? 'badge-member' : ''}`}>
                      {u.role || 'visitor'}
                    </span>
                  : u.declined
                    ? <span className="admin-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Declined</span>
                    : <span className="admin-badge badge-pending">Pending</span>}
              </div>
              <div className="admin-card-actions">
                {!u.approved && !u.declined && (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => approveUser(u.id)}
                      disabled={actionInProgress === `approve-${u.id}`}
                    >
                      {actionInProgress === `approve-${u.id}` ? '...' : 'Approve as Member'}
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => makeVisitor(u.id)}
                      disabled={actionInProgress === `visitor-${u.id}`}
                    >
                      {actionInProgress === `visitor-${u.id}` ? '...' : 'Approve as Visitor'}
                    </button>
                  </>
                )}
                {!u.approved && u.declined && (
                  <button
                    className="btn btn-sm"
                    onClick={() => approveUser(u.id)}
                    disabled={actionInProgress === `approve-${u.id}`}
                  >
                    {actionInProgress === `approve-${u.id}` ? '...' : 'Reinstate as Member'}
                  </button>
                )}
                {u.approved && (
                  <>
                    <select
                      value={u.role || 'visitor'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={actionInProgress === `role-${u.id}`}
                      className="role-select"
                    >
                      <option value="visitor">Visitor</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => revokeApproval(u.id)}
                      disabled={actionInProgress === `revoke-${u.id}`}
                    >
                      {actionInProgress === `revoke-${u.id}` ? '...' : 'Revoke'}
                    </button>
                  </>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => deleteUser(u.user_id)}
                  disabled={actionInProgress === `delete-${u.user_id}`}
                >
                  {actionInProgress === `delete-${u.user_id}` ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* PROPERTIES TAB */}
      {activeTab === 'properties' && (
        <section className="admin-section">
          <div className="admin-filters">
            {PROPERTY_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-pill${propertyFilter === f ? ' active' : ''}`}
                onClick={() => setPropertyFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loadingProps && <p>Loading listings...</p>}
          {!loadingProps && filteredProperties.length === 0 && (
            <p className="admin-empty">No listings in this filter.</p>
          )}

          {filteredProperties.map((p) => (
            <div key={p.id} className="admin-card">
              <div className="admin-card-info">
                <strong>{p.address}</strong>
                {p.price != null && <span>${Number(p.price).toLocaleString()}</span>}
                <span>by {[p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(' ') || p.profiles?.email || 'Unknown'}</span>
                <span className={`admin-badge ${
                  p.status === 'active' ? 'badge-member'
                    : p.status === 'flagged' ? 'badge-admin'
                    : 'badge-pending'
                }`}>
                  {p.status || 'unknown'}
                </span>
                {p.approved
                  ? <span className="admin-badge badge-member">Approved</span>
                  : <span className="admin-badge badge-pending">Not approved</span>}
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
                {p.status !== 'flagged' ? (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => flagProperty(p.id)}
                    disabled={actionInProgress === `flag-prop-${p.id}`}
                  >
                    {actionInProgress === `flag-prop-${p.id}` ? '...' : 'Flag'}
                  </button>
                ) : (
                  <button
                    className="btn btn-sm"
                    onClick={() => unflagProperty(p.id)}
                    disabled={actionInProgress === `unflag-prop-${p.id}`}
                  >
                    {actionInProgress === `unflag-prop-${p.id}` ? '...' : 'Unflag'}
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
      )}

      {/* BUY BOXES TAB */}
      {activeTab === 'buyboxes' && (
        <section className="admin-section">
          <div className="admin-filters">
            {BUY_BOX_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-pill${buyBoxFilter === f ? ' active' : ''}`}
                onClick={() => setBuyBoxFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loadingBoxes && <p>Loading buy boxes...</p>}
          {!loadingBoxes && filteredBuyBoxes.length === 0 && (
            <p className="admin-empty">No buy boxes in this filter.</p>
          )}

          {filteredBuyBoxes.map((b) => (
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
                {b.approved
                  ? <span className="admin-badge badge-member">Approved</span>
                  : b.flag_reason
                    ? <span className="admin-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Flagged</span>
                    : <span className="admin-badge badge-pending">Pending</span>}
                {b.flag_reason && (
                  <span className="field-note" style={{ width: '100%', marginTop: 4 }}>
                    Reason: {b.flag_reason}
                  </span>
                )}
                {b.flag_response && (
                  <span className="field-note" style={{ width: '100%', marginTop: 4 }}>
                    Member reply: {b.flag_response}
                  </span>
                )}
              </div>
              <div className="admin-card-actions">
                {!b.approved && (
                  <button
                    className="btn btn-sm"
                    onClick={() => approveBuyBox(b.id)}
                    disabled={actionInProgress === `approve-bb-${b.id}`}
                  >
                    {actionInProgress === `approve-bb-${b.id}` ? '...' : 'Approve'}
                  </button>
                )}
                {b.approved && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => flagBuyBox(b.id)}
                    disabled={actionInProgress === `flag-bb-${b.id}`}
                  >
                    {actionInProgress === `flag-bb-${b.id}` ? '...' : 'Flag'}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => denyBuyBox(b.id)}
                  disabled={actionInProgress === `deny-bb-${b.id}`}
                >
                  {actionInProgress === `deny-bb-${b.id}` ? '...' : b.approved ? 'Remove' : 'Deny'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
