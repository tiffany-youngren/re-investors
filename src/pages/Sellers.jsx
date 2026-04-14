import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PropertyForm from '../components/PropertyForm'

function isProfileComplete(profile) {
  return (
    profile &&
    profile.full_name &&
    profile.phone &&
    profile.license_status &&
    (profile.license_status !== 'licensed' || profile.brokerage_name)
  )
}

export default function Sellers() {
  const { user, profile } = useAuth()
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)

  async function fetchListings() {
    setLoadingListings(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching listings:', error.message)
    } else {
      setListings(data || [])
    }
    setLoadingListings(false)
  }

  useEffect(() => {
    if (user) fetchListings()
  }, [user])

  if (!isProfileComplete(profile)) {
    return (
      <div className="sellers-page">
        <h1>Sellers</h1>
        <div className="form-card">
          <h2>Complete Your Profile First</h2>
          <p>You need to fill out your profile before listing properties.</p>
          <Link to="/profile" className="btn" style={{ marginTop: 16 }}>Go to Profile</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="sellers-page">
      <h1>Sellers</h1>

      <PropertyForm onSaved={fetchListings} />

      <div className="my-listings">
        <h2>Your Listings</h2>
        {loadingListings && <p>Loading...</p>}
        {!loadingListings && listings.length === 0 && (
          <p>You have no listings yet. Use the form above to add one.</p>
        )}
        {listings.map((listing) => (
          <div key={listing.id} className="listing-card">
            {listing.property_images?.length > 0 && (
              <img
                src={listing.property_images[0].image_url}
                alt={listing.address}
                className="listing-thumb"
              />
            )}
            <div className="listing-info">
              <h3>{listing.address}</h3>
              <p className="listing-price">${Number(listing.price).toLocaleString()}</p>
              <p>
                {listing.property_type} &middot; {listing.condition} &middot; {listing.occupancy}
              </p>
              <p className="listing-meta">
                {listing.seller_type} &middot; {listing.financing?.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
