import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...(options.headers || {}),
    },
  })
  return res.json()
}

export default function MemberContact() {
  const { profileId } = useParams()
  const { user, profile: myProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sourceType = searchParams.get('source') || null
  const sourceId = searchParams.get('id') || null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Fetch the recipient member's profile
  const { data: member, isLoading } = useQuery({
    queryKey: ['member-contact', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, city, state, investment_areas, license_status, brokerage_name, phone, phone_country_code')
        .eq('id', profileId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profileId,
  })

  // Pre-fill form when my profile loads
  useEffect(() => {
    if (myProfile) {
      const fullName = [myProfile.first_name, myProfile.last_name].filter(Boolean).join(' ')
      if (!name) setName(fullName)
      if (!email) setEmail(myProfile.email || user?.email || '')
    }
  }, [myProfile, user])

  if (isLoading) return <div className="loading">Loading...</div>
  if (!member) return <div className="loading">Member not found.</div>

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill out all fields.')
      return
    }
    setSubmitting(true)
    const result = await authFetch('/api/contact-member', {
      method: 'POST',
      body: JSON.stringify({
        toProfileId: member.id,
        contactType: 'form',
        sourceType,
        sourceId,
        senderName: name.trim(),
        senderEmail: email.trim(),
        message: message.trim(),
      }),
    })
    setSubmitting(false)
    if (result?.success) {
      setSuccess('Message sent! They will reply by email.')
      setMessage('')
    } else {
      setError(result?.error || 'Failed to send message.')
    }
  }

  async function handleTextClick() {
    // Log the event server-side (non-blocking)
    authFetch('/api/contact-member', {
      method: 'POST',
      body: JSON.stringify({
        toProfileId: member.id,
        contactType: 'text',
        sourceType,
        sourceId,
      }),
    }).catch(() => {})
    // Build the sms: link. Include country code if present.
    if (!member.phone) return
    const fullNumber = `${member.phone_country_code || '+1'}${member.phone}`
    window.location.href = `sms:${fullNumber}`
  }

  return (
    <div className="member-contact-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>← Back</button>

      <div className="form-card">
        <div className="member-header">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" className="profile-avatar-lg" />
          ) : (
            <div className="profile-avatar-lg profile-avatar-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <h1 style={{ margin: 0 }}>
              {[member.first_name, member.last_name].filter(Boolean).join(' ') || 'Member'}
            </h1>
            {(member.city || member.state) && (
              <p style={{ margin: '4px 0 0', color: 'var(--text)' }}>
                {[member.city, member.state].filter(Boolean).join(', ')}
              </p>
            )}
            {member.license_status && (
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                {member.license_status === 'licensed'
                  ? `Licensed Agent/Broker${member.brokerage_name ? ` — ${member.brokerage_name}` : ''}`
                  : 'Unlicensed'}
              </p>
            )}
          </div>
        </div>

        {member.investment_areas?.length > 0 && (
          <div className="profile-section">
            <h2 style={{ fontSize: '1rem' }}>Investment Areas</h2>
            <p>{member.investment_areas.map((a) => `${a.city}, ${a.state}`).join(' · ')}</p>
          </div>
        )}

        <h2 style={{ fontSize: '1.1rem', marginTop: 24 }}>Send a Message</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="contactName">Your Name</label>
          <input
            id="contactName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="contactEmail">Your Email</label>
          <input
            id="contactEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="contactMessage">Message</label>
          <textarea
            id="contactMessage"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${member.first_name || ''}, ...`}
            required
          />

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {member.phone && (
          <>
            <p className="field-note" style={{ marginTop: 16, marginBottom: 4 }}>
              Prefer to text instead?
            </p>
            <button type="button" className="btn btn-secondary" onClick={handleTextClick}>
              Text Me
            </button>
          </>
        )}
      </div>
    </div>
  )
}
