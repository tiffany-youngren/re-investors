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
    await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({ profileId, approved: true, role: 'member' }),
    })
    await fetchUsers()
    setActionInProgress('')
  }

  async function makeVisitor(profileId) {
    setActionInProgress(`visitor-${profileId}`)
    await apiFetch('/api/admin-users', {
      method: 'POST',
      body: JSON.stringify({ profileId, approved: true, role: 'visitor' }),
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
    if (!window.confirm('Flag this listing? It will be hidden from the For Sale page.')) return
    setActionInProgress(`flag-prop-${propertyId}`)
    await apiFetch('/api/admin-properties', {
      method: 'POST',
      body: JSON.stringify({ propertyId, flagged: true }),
    })
    await fetchProperties()
    setActionInProgress('')
  }

  async function unflagProperty(propertyId) {
    setActionInProgress(`unflag-prop-${propertyId}`)
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

  // ---------- BUY BOX ACTIONS ----------
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

  // ---------- FILTERED DATA ----------
  const filteredUsers = users.filter((u) => {
    if (userFilter === 'all') return true
    if (userFilter === 'members') return u.approved && u.role === 'member'
    if (userFilter === 'visitors') return u.approved && u.role === 'visitor'
    if (userFilter === 'pending') return !u.approved
    if (userFilter === 'declined') return u.role === 'declined'
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
                {!u.approved
                  ? <span className="admin-badge badge-pending">Pending</span>
                  : <span className={`admin-badge ${u.role === 'admin' ? 'badge-admin' : u.role === 'member' ? 'badge-member' : ''}`}>
                      {u.role || 'visitor'}
                    </span>}
              </div>
              <div className="admin-card-actions">
                {!u.approved && (
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
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => denyUser(u.user_id)}
                      disabled={actionInProgress === `deny-${u.user_id}`}
                    >
                      {actionInProgress === `deny-${u.user_id}` ? '...' : 'Deny'}
                    </button>
                  </>
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
                      className="btn btn-sm btn-danger"
                      onClick={() => revokeApproval(u.id)}
                      disabled={actionInProgress === `revoke-${u.id}`}
                    >
                      {actionInProgress === `revoke-${u.id}` ? '...' : 'Revoke'}
                    </button>
                  </>
                )}
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
                  : <span className="admin-badge badge-pending">Pending</span>}
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
                    onClick={() => unapproveBuyBox(b.id)}
                    disabled={actionInProgress === `unapprove-bb-${b.id}`}
                  >
                    {actionInProgress === `unapprove-bb-${b.id}` ? '...' : 'Unapprove'}
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
