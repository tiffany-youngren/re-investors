import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { US_STATES, COUNTRY_CODES, DEFAULT_COUNTRY_CODE, formatPhone, stripPhone } from '../lib/utils'

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
  const [searchParams] = useSearchParams()
  const isWelcome = searchParams.get('welcome') === '1'
  const isUpgrade = searchParams.get('upgrade') === '1'

  // Form state
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile?.phone_country_code || DEFAULT_COUNTRY_CODE)
  const [phone, setPhone] = useState(formatPhone(profile?.phone || '', profile?.phone_country_code || DEFAULT_COUNTRY_CODE))
  const [city, setCity] = useState(profile?.city || '')
  const [state, setState] = useState(profile?.state || '')
  const [licenseStatus, setLicenseStatus] = useState(profile?.license_status || '')
  const [brokerageName, setBrokerageName] = useState(profile?.brokerage_name || '')
  const [investmentAreas, setInvestmentAreas] = useState(profile?.investment_areas || [])
  const [newAreaCity, setNewAreaCity] = useState('')
  const [newAreaState, setNewAreaState] = useState('')
  const [attendsMeetups, setAttendsMeetups] = useState(
    profile?.attends_meetups === true ? 'yes' : profile?.attends_meetups === false ? 'no' : ''
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Fetch user's properties
  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, price, status, expires_at, property_images(image_url, display_order)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })

  // Fetch user's buy boxes
  const { data: buyBoxes = [] } = useQuery({
    queryKey: ['my-buy-boxes', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buy_boxes')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })

  const deletePropertyMutation = useMutation({
    mutationFn: async (property) => {
      // Delete images from storage
      if (property.property_images?.length > 0) {
        const paths = property.property_images.map((img) => {
          try {
            const url = new URL(img.image_url)
            const parts = url.pathname.split('/property-images/')
            return parts[1] || ''
          } catch { return '' }
        }).filter(Boolean)
        if (paths.length > 0) {
          await supabase.storage.from('property-images').remove(paths)
        }
      }
      await supabase.from('property_images').delete().eq('property_id', property.id)
      await supabase.from('property_units').delete().eq('property_id', property.id)
      const { error } = await supabase.from('properties').delete().eq('id', property.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] })
    },
  })

  const deleteBuyBoxMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('buy_boxes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-buy-boxes'] })
      queryClient.invalidateQueries({ queryKey: ['buyBoxes'] })
      queryClient.invalidateQueries({ queryKey: ['buyBoxCount'] })
    },
  })

  const updatePropertyStatusMutation = useMutation({
    mutationFn: async ({ id, status, expires_at }) => {
      const updates = { status }
      if (expires_at) updates.expires_at = expires_at
      const { error } = await supabase.from('properties').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] })
    },
  })

  function handleDeleteProperty(property) {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      deletePropertyMutation.mutate(property)
    }
  }

  function handleDeleteBuyBox(id) {
    if (window.confirm('Are you sure you want to delete this buy box?')) {
      deleteBuyBoxMutation.mutate(id)
    }
  }

  function promptNewExpiration(current) {
    const today = new Date()
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
    const defaultVal = maxDate.toISOString().slice(0, 10)
    const entry = window.prompt(
      `Enter a new expiration date (YYYY-MM-DD). Max 30 days from today (${defaultVal}).`,
      defaultVal
    )
    if (!entry) return null
    const d = new Date(entry)
    if (isNaN(d.getTime())) { alert('Invalid date.'); return null }
    d.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    if (d < today) { alert('Expiration date cannot be in the past.'); return null }
    maxDate.setHours(23, 59, 59, 999)
    if (d > maxDate) { alert('Expiration date cannot be more than 30 days from today.'); return null }
    return entry
  }

  function handleDeactivate(id) {
    if (!window.confirm('Deactivate this listing? It will no longer show on the For Sale page.')) return
    updatePropertyStatusMutation.mutate({ id, status: 'deactivated' })
  }

  function handleReactivate(property) {
    const nowIso = new Date().toISOString()
    const isExpired = !property.expires_at || property.expires_at < nowIso
    if (isExpired) {
      const newDate = promptNewExpiration()
      if (!newDate) return
      updatePropertyStatusMutation.mutate({ id: property.id, status: 'active', expires_at: newDate })
    } else {
      updatePropertyStatusMutation.mutate({ id: property.id, status: 'active' })
    }
  }

  function handleRenew(property) {
    const newDate = promptNewExpiration()
    if (!newDate) return
    updatePropertyStatusMutation.mutate({ id: property.id, status: 'active', expires_at: newDate })
  }

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
      phone_country_code: phoneCountryCode,
      city: city.trim() || null,
      state: state.trim() || null,
      license_status: licenseStatus,
      brokerage_name: licenseStatus === 'licensed' ? brokerageName.trim() : null,
      investment_areas: investmentAreas,
      attends_meetups: attendsMeetups === 'yes' ? true : attendsMeetups === 'no' ? false : null,
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

      {isWelcome && (
        <div className="profile-notice" style={{ marginBottom: 20 }}>
          <h2>Welcome!</h2>
          <p>Please complete your profile to get started.</p>
        </div>
      )}

      {isUpgrade && (
        <div className="profile-warning" style={{ marginBottom: 20 }}>
          <p>
            <strong>Members only.</strong> Posting properties and buy boxes is reserved
            for approved members. You must attend at least 2 of the last 4 Based in Billings
            meetups and be approved by admin. Complete your profile and an admin will review
            your membership status.
          </p>
        </div>
      )}

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
          <div className="phone-input-row">
            <select
              className="phone-country-select"
              value={phoneCountryCode}
              onChange={(e) => {
                const newCode = e.target.value
                setPhoneCountryCode(newCode)
                setPhone(formatPhone(phone, newCode))
              }}
            >
              {COUNTRY_CODES.map((c, i) => (
                <option key={`${c.code}-${c.label}-${i}`} value={c.code}>{c.label} {c.code}</option>
              ))}
            </select>
            <input
              id="profilePhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value, phoneCountryCode))}
              placeholder={phoneCountryCode === '+1' ? '(xxx) xxx-xxxx' : 'Phone number'}
              required
            />
          </div>

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
              <div className="form-field" style={{ flex: 3 }}>
                <input type="text" placeholder="City" value={newAreaCity} onChange={(e) => setNewAreaCity(e.target.value)} />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <select value={newAreaState} onChange={(e) => setNewAreaState(e.target.value)}>
                  <option value="">State</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addInvestmentArea}>Add</button>
            </div>
          </div>

          <fieldset className="financing-fieldset" style={{ marginTop: 16 }}>
            <legend>Do you regularly attend Based in Billings Real Estate Investment meetups? *</legend>
            <label className="checkbox-label">
              <input
                type="radio"
                name="attendsMeetups"
                value="yes"
                checked={attendsMeetups === 'yes'}
                onChange={() => setAttendsMeetups('yes')}
                required
              />
              Yes
            </label>
            <label className="checkbox-label">
              <input
                type="radio"
                name="attendsMeetups"
                value="no"
                checked={attendsMeetups === 'no'}
                onChange={() => setAttendsMeetups('no')}
              />
              No
            </label>
          </fieldset>
          <p className="field-note">
            We encourage members to attend all monthly meetings. You must have attended at least 2
            of the last 4 meetups to be approved as a member and post For Sale Properties and Buy
            Boxes on the site.
          </p>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Solicitation warning */}
      <div className="profile-warning">
        <p>
          Any member or visitor who contacts a member to solicit outside of what is listed here
          will likely lose access to the app.
        </p>
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
          {properties.map((p) => {
            const sortedImages = [...(p.property_images || [])].sort(
              (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
            )
            const isDeleting = deletePropertyMutation.isPending && deletePropertyMutation.variables?.id === p.id
            return (
              <div key={p.id} className="listing-card">
                {sortedImages.length > 0 && (
                  <img src={sortedImages[0].image_url} alt={p.address} className="listing-thumb" />
                )}
                <div className="listing-info">
                  <h3>{p.address}</h3>
                  <p className="listing-price">${Number(p.price).toLocaleString()}</p>
                  <p>
                    {p.status === 'draft' && <span className="admin-badge badge-pending">Draft</span>}
                    {p.status === 'active' && <span className="admin-badge badge-member">Active</span>}
                    {p.status === 'expired' && <span className="admin-badge badge-pending">Expired</span>}
                    {p.status === 'deactivated' && <span className="admin-badge" style={{ background: '#e5e7eb', color: '#4b5563' }}>Deactivated</span>}
                    {p.status === 'flagged' && <span className="admin-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Flagged</span>}
                    {p.expires_at && p.status === 'active' && (
                      <span className="field-note" style={{ display: 'inline', marginLeft: 8 }}>
                        Expires {new Date(p.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  <div className="listing-actions">
                    <Link to={`/sellers?edit=${p.id}`} className="btn btn-sm btn-secondary">Edit</Link>
                    {p.status === 'active' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDeactivate(p.id)}
                        disabled={updatePropertyStatusMutation.isPending}
                      >
                        Deactivate
                      </button>
                    )}
                    {p.status === 'deactivated' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => handleReactivate(p)}
                        disabled={updatePropertyStatusMutation.isPending}
                      >
                        Reactivate
                      </button>
                    )}
                    {p.status === 'expired' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => handleRenew(p)}
                        disabled={updatePropertyStatusMutation.isPending}
                      >
                        Renew
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteProperty(p)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My buy boxes */}
      {isMember && buyBoxes.length > 0 && (
        <div className="profile-section">
          <h2>Your Buy Boxes</h2>
          {buyBoxes.map((bb) => {
            const isDeleting = deleteBuyBoxMutation.isPending && deleteBuyBoxMutation.variables === bb.id
            const areasText = (bb.areas_looking || []).map((a) => `${a.city}, ${a.state}`).join(' · ')
            return (
              <div key={bb.id} className="listing-card">
                <div className="listing-info">
                  <h3>{areasText || 'Buy Box'}</h3>
                  <p>{bb.property_types?.join(', ')}</p>
                  {bb.price_max && (
                    <p className="listing-price">
                      {bb.price_min ? `$${Number(bb.price_min).toLocaleString()} – ` : 'Up to '}
                      ${Number(bb.price_max).toLocaleString()}
                    </p>
                  )}
                  <div className="listing-actions">
                    <Link to={`/buy-box/${bb.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteBuyBox(bb.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
