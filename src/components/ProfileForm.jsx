import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatPhone, stripPhone } from '../lib/utils'

export default function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(formatPhone(profile?.phone || ''))
  const [licenseStatus, setLicenseStatus] = useState(profile?.license_status || '')
  const [brokerageName, setBrokerageName] = useState(profile?.brokerage_name || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (licenseStatus === 'licensed' && !brokerageName.trim()) {
      setError('Brokerage name is required for licensed members.')
      setSubmitting(false)
      return
    }

    const profileData = {
      user_id: user.id,
      email: user.email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: stripPhone(phone),
      license_status: licenseStatus,
      brokerage_name: licenseStatus === 'licensed' ? brokerageName.trim() : null,
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
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(xxx) xxx-xxxx"
            required
          />

          <label htmlFor="licenseStatus">License Status</label>
          <select
            id="licenseStatus"
            value={licenseStatus}
            onChange={(e) => {
              setLicenseStatus(e.target.value)
              if (e.target.value !== 'licensed') {
                setBrokerageName('')
              }
            }}
            required
          >
            <option value="">Select...</option>
            <option value="unlicensed">Unlicensed</option>
            <option value="licensed">Licensed Agent/Broker</option>
          </select>

          {licenseStatus === 'licensed' && (
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
