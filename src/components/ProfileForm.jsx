import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [licenseStatus, setLicenseStatus] = useState(profile?.license_status || '')
  const [brokerageName, setBrokerageName] = useState(profile?.brokerage_name || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (licenseStatus === 'Licensed in Montana' && !brokerageName.trim()) {
      setError('Brokerage name is required for licensed members.')
      setSubmitting(false)
      return
    }

    const profileData = {
      user_id: user.id,
      email: user.email,
      full_name: fullName.trim(),
      phone: phone.trim(),
      license_status: licenseStatus,
      brokerage_name: licenseStatus === 'Licensed in Montana' ? brokerageName.trim() : null,
    }

    let result
    if (profile?.id) {
      result = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', profile.id)
    } else {
      result = await supabase
        .from('profiles')
        .insert(profileData)
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      await refreshProfile()
    }

    setSubmitting(false)
  }

  return (
    <div className="profile-form-wrapper">
      <div className="form-card">
        <h2>Complete Your Profile</h2>
        <p>You need to fill out your profile before listing properties.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <label htmlFor="licenseStatus">License Status</label>
          <select
            id="licenseStatus"
            value={licenseStatus}
            onChange={(e) => {
              setLicenseStatus(e.target.value)
              if (e.target.value !== 'Licensed in Montana') {
                setBrokerageName('')
              }
            }}
            required
          >
            <option value="">Select...</option>
            <option value="Unlicensed">Unlicensed</option>
            <option value="Licensed in Montana">Licensed in Montana</option>
          </select>

          {licenseStatus === 'Licensed in Montana' && (
            <>
              <label htmlFor="brokerageName">Brokerage Name</label>
              <input
                id="brokerageName"
                type="text"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                required
              />
            </>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
