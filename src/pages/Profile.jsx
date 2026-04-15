import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { US_STATES, formatPhone, stripPhone } from '../lib/utils'

async function resizeAvatar(file, maxSize = 300) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize }
          else { w = Math.round((w * maxSize) / h); h = maxSize }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  // Form state
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(formatPhone(profile?.phone || ''))
  const [city, setCity] = useState(profile?.city || '')
  const [state, setState] = useState(profile?.state || '')
  const [licenseStatus, setLicenseStatus] = useState(profile?.license_status || '')
  const [brokerageName, setBrokerageName] = useState(profile?.brokerage_name || '')
  const [investmentAreas, setInvestmentAreas] = useState(profile?.investment_areas || [])
  const [newAreaCity, setNewAreaCity] = useState('')
  const [newAreaState, setNewAreaState] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Fetch user's properties
  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, price, property_images(image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Fetch user's buy boxes
  const { data: buyBoxes = [] } = useQuery({
    queryKey: ['my-buy-boxes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buy_boxes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  function addInvestmentArea() {
    if (!newAreaCity.trim() || !newAreaState.trim()) return
    setInvestmentAreas([...investmentAreas, { city: newAreaCity.trim(), state: newAreaState.trim() }])
    setNewAreaCity('')
    setNewAreaState('')
  }

  function removeInvestmentArea(index) {
    setInvestmentAreas(investmentAreas.filter((_, i) => i !== index))
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)

    const resized = await resizeAvatar(file)
    const fileName = `${user.id}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, resized, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      setError(`Avatar upload failed: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    await refreshProfile()
    setUploadingAvatar(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (licenseStatus === 'licensed' && !brokerageName.trim()) {
      setError('Brokerage name is required for licensed agents/brokers.')
      setSubmitting(false)
      return
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const profileData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: stripPhone(phone),
      city: city.trim() || null,
      state: state.trim() || null,
      license_status: licenseStatus,
      brokerage_name: licenseStatus === 'licensed' ? brokerageName.trim() : null,
      investment_areas: investmentAreas,
    }

    let result
    if (profile?.id) {
      result = await supabase.from('profiles').update(profileData).eq('id', profile.id)
    } else {
      result = await supabase.from('profiles').insert({ ...profileData, user_id: user.id, email: user.email })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess('Profile saved.')
      await refreshProfile()
    }

    setSubmitting(false)
  }

  const isMember = profile?.role === 'member' || profile?.role === 'admin'
  const isVisitor = profile?.role === 'visitor'

  return (
    <div className="profile-page">
      <h1>Your Profile</h1>

      {/* Avatar */}
      <div className="profile-avatar-section">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="profile-avatar-lg" />
        ) : (
          <div className="profile-avatar-lg profile-avatar-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
        <div>
          <label className="btn btn-sm btn-secondary avatar-upload-btn">
            {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
              hidden
            />
          </label>
        </div>
      </div>

      {/* Profile form */}
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <label htmlFor="profileEmail">Email</label>
          <input id="profileEmail" type="email" value={user?.email || ''} disabled />

          <label htmlFor="profilePhone">Phone</label>
          <input id="profilePhone" type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(xxx) xxx-xxxx" required />

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="profileCity">City</label>
              <input id="profileCity" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="profileState">State</label>
              <select id="profileState" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Select...</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="profileLicense">License Status</label>
          <select
            id="profileLicense"
            value={licenseStatus}
            onChange={(e) => {
              setLicenseStatus(e.target.value)
              if (e.target.value !== 'licensed') setBrokerageName('')
            }}
            required
          >
            <option value="">Select...</option>
            <option value="unlicensed">Unlicensed</option>
            <option value="licensed">Licensed Agent/Broker</option>
          </select>

          {licenseStatus === 'licensed' && (
            <>
              <label htmlFor="profileBrokerage">Brokerage Name</label>
              <input id="profileBrokerage" type="text" value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} required />
            </>
          )}

          {/* Investment areas */}
          <label>Investment Areas</label>
          <div className="investment-areas">
            {investmentAreas.map((area, i) => (
              <div key={i} className="investment-area-item">
                <span>{area.city}, {area.state}</span>
                <button type="button" className="remove-img-btn" onClick={() => removeInvestmentArea(i)}>Remove</button>
              </div>
            ))}
            <div className="form-row investment-area-add">
              <input type="text" placeholder="City" value={newAreaCity} onChange={(e) => setNewAreaCity(e.target.value)} />
              <select value={newAreaState} onChange={(e) => setNewAreaState(e.target.value)}>
                <option value="">State</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addInvestmentArea}>Add</button>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Member actions */}
      {isMember && (
        <div className="profile-actions">
          <Link to="/sellers" className="btn">Post a Property</Link>
          <Link to="/buy-box/new" className="btn btn-secondary">Add Buy Box</Link>
        </div>
      )}

      {/* My properties */}
      {isMember && properties.length > 0 && (
        <div className="profile-section">
          <h2>Your Property Listings</h2>
          {properties.map((p) => (
            <div key={p.id} className="listing-card">
              {p.property_images?.length > 0 && (
                <img src={p.property_images[0].image_url} alt={p.address} className="listing-thumb" />
              )}
              <div className="listing-info">
                <h3>{p.address}</h3>
                <p className="listing-price">${Number(p.price).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My buy boxes */}
      {isMember && buyBoxes.length > 0 && (
        <div className="profile-section">
          <h2>Your Buy Boxes</h2>
          {buyBoxes.map((bb) => (
            <div key={bb.id} className="listing-card">
              <div className="listing-info">
                <h3>{bb.title || 'Buy Box'}</h3>
                <p>{bb.property_types?.join(', ')}</p>
                {bb.max_price && <p className="listing-price">Up to ${Number(bb.max_price).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visitor notice */}
      {isVisitor && (
        <div className="profile-notice">
          <h2>Becoming a Member</h2>
          <p>
            Visitors can become Members if (1) they attended 2 of the last 4 in-person meetups
            and (2) their profile is complete and matches the information connected to their
            membership, as verified by admin. Members will be demoted to Visitors when they don't
            meet both criteria.
          </p>
        </div>
      )}

      {/* Solicitation warning */}
      <div className="profile-warning">
        <p>
          Any member or visitor who contacts a member to solicit outside of what is listed here
          will likely lose access to the app.
        </p>
      </div>
    </div>
  )
}
