import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PropertyForm from '../components/PropertyForm'

function isProfileComplete(profile) {
  return (
    profile &&
    profile.first_name &&
    profile.last_name &&
    profile.phone &&
    profile.license_status &&
    (profile.license_status !== 'licensed' || profile.brokerage_name)
  )
}

export default function Sellers() {
  const { profile } = useAuth()
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [editingProperty, setEditingProperty] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const formRef = useRef(null)

  async function fetchListings() {
    setLoadingListings(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*)')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching listings:', error.message)
    } else {
      setListings(data || [])
    }
    setLoadingListings(false)
  }

  useEffect(() => {
    if (profile?.id) fetchListings()
  }, [profile?.id])

  function handleEdit(listing) {
    setEditingProperty(listing)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function handleSaved() {
    setEditingProperty(null)
    fetchListings()
  }

  function handleCancelEdit() {
    setEditingProperty(null)
  }

  async function handleDelete(listing) {
    if (!window.confirm(`Delete the listing at ${listing.address}? This cannot be undone.`)) return
    setDeletingId(listing.id)

    // Delete images from storage
    if (listing.property_images?.length > 0) {
      const paths = listing.property_images.map((img) => {
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

    // Delete child rows then property
    await supabase.from('property_images').delete().eq('property_id', listing.id)
    await supabase.from('property_units').delete().eq('property_id', listing.id)
    const { error } = await supabase.from('properties').delete().eq('id', listing.id)

    if (error) {
      alert(`Failed to delete: ${error.message}`)
    } else {
      if (editingProperty?.id === listing.id) setEditingProperty(null)
      await fetchListings()
    }
    setDeletingId(null)
  }

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

      <div ref={formRef}>
        <PropertyForm
          key={editingProperty?.id || 'new'}
          editingProperty={editingProperty}
          onSaved={handleSaved}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      <div className="my-listings">
        <h2>Your Listings</h2>
        {loadingListings && <p>Loading...</p>}
        {!loadingListings && listings.length === 0 && (
          <p>You have no listings yet. Use the form above to add one.</p>
        )}
        {listings.map((listing) => {
          const sortedImages = [...(listing.property_images || [])].sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          )
          return (
            <div key={listing.id} className="listing-card">
              {sortedImages.length > 0 && (
                <img
                  src={sortedImages[0].image_url}
                  alt={listing.address}
                  className="listing-thumb"
                />
              )}
              <div className="listing-info">
                <h3>{listing.address}</h3>
                <p className="listing-price">${Number(listing.price).toLocaleString()}</p>
                <p>
                  {listing.property_type} &middot; {listing.condition} &middot; {listing.occupancy_status}
                  {listing.status === 'draft' && <span className="admin-badge badge-pending" style={{ marginLeft: 8 }}>Draft</span>}
                  {listing.status === 'published' && <span className="admin-badge badge-member" style={{ marginLeft: 8 }}>Published</span>}
                </p>
                <p className="listing-meta">
                  {listing.seller_type} &middot; {listing.financing?.join(', ')}
                </p>
                <div className="listing-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(listing)}>Edit</button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(listing)}
                    disabled={deletingId === listing.id}
                  >
                    {deletingId === listing.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
