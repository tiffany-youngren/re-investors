import { useState } from 'react'
import { Link } from 'react-router-dom'

// Parse "{street}, {city}, {ST} {zip}" back into parts for display
function parseAddress(full) {
  if (!full) return { street: '', city: '', state: '', zip: '' }
  const parts = full.split(',').map((p) => p.trim())
  if (parts.length < 3) return { street: full, city: '', state: '', zip: '' }
  const street = parts[0]
  const city = parts[1]
  const stateZip = parts.slice(2).join(', ').trim()
  const m = stateZip.match(/^([A-Z]{2})\s+(.+)$/)
  if (m) return { street, city, state: m[1], zip: m[2] }
  return { street, city, state: '', zip: stateZip }
}

export default function PropertyDetail({ property, onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const images = [...(property.property_images || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  )
  const units = [...(property.property_units || [])].sort(
    (a, b) => (a.unit_number ?? 0) - (b.unit_number ?? 0)
  )
  const seller = property.profiles
  const addr = parseAddress(property.address)

  function nextLightbox() {
    setLightboxIndex((i) => (i === null ? 0 : (i + 1) % images.length))
  }
  function prevLightbox() {
    setLightboxIndex((i) => (i === null ? 0 : (i - 1 + images.length) % images.length))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {/* Primary image */}
        {images.length > 0 && (
          <img
            src={images[0].image_url}
            alt={property.address}
            className="pd-primary-img"
            onClick={() => setLightboxIndex(0)}
          />
        )}

        {/* Header info */}
        <div className="pd-header">
          <h2>{addr.street || property.address}</h2>
          {(addr.city || addr.state || addr.zip) && (
            <p className="pd-subaddress">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ').replace(`, ${addr.zip}`, ` ${addr.zip}`)}</p>
          )}
          {property.price && (
            <p className="pd-price">${Number(property.price).toLocaleString()}</p>
          )}
        </div>

        {/* Quick facts */}
        <div className="pd-facts">
          {property.property_type && (
            <div className="pd-fact"><span>Type</span><strong>{property.property_type}</strong></div>
          )}
          {property.seller_type && (
            <div className="pd-fact"><span>Seller</span><strong>{property.seller_type}</strong></div>
          )}
          {property.condition && (
            <div className="pd-fact"><span>Condition</span><strong>{property.condition}</strong></div>
          )}
          {property.occupancy_status && (
            <div className="pd-fact"><span>Occupancy</span><strong>{property.occupancy_status}</strong></div>
          )}
          {property.property_type === 'multi-family' && property.num_units && (
            <div className="pd-fact"><span>Units</span><strong>{property.num_units}</strong></div>
          )}
        </div>

        {/* Multi-family unit details */}
        {property.property_type === 'multi-family' && units.length > 0 && (
          <div className="pd-section">
            <h3>Unit Details</h3>
            <div className="pd-units">
              {units.map((u) => (
                <div key={u.id || u.unit_number} className="pd-unit">
                  <strong>Unit {u.unit_number}</strong>
                  <span>{u.bedrooms ?? '?'} bd / {u.bathrooms ?? '?'} ba</span>
                  {u.sqft && <span>{Number(u.sqft).toLocaleString()} sq ft</span>}
                  {u.rent && <span>${Number(u.rent).toLocaleString()}/mo</span>}
                  {u.occupancy && <span>{u.occupancy}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financing */}
        {property.financing?.length > 0 && (
          <div className="pd-section">
            <h3>Financing</h3>
            <p>{property.financing.join(', ')}</p>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div className="pd-section">
            <h3>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{property.description}</p>
          </div>
        )}

        {/* Repairs needed */}
        {property.repairs_needed && (
          <div className="pd-section">
            <h3>Repairs Needed</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{property.repairs_needed}</p>
          </div>
        )}

        {/* Financials */}
        {(property.rehab_cost_estimate || property.estimated_arv) && (
          <div className="pd-section">
            <h3>Financials</h3>
            {property.rehab_cost_estimate && (
              <p><strong>Rehab Cost Estimate:</strong> ${Number(property.rehab_cost_estimate).toLocaleString()}</p>
            )}
            {property.estimated_arv && (
              <p><strong>Estimated ARV:</strong> ${Number(property.estimated_arv).toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Links */}
        {(property.county_records_url || property.virtual_tour_url) && (
          <div className="pd-section">
            <h3>Links</h3>
            {property.county_records_url && (
              <p><a href={property.county_records_url} target="_blank" rel="noopener noreferrer">View County Records</a></p>
            )}
            {property.virtual_tour_url && (
              <p><a href={property.virtual_tour_url} target="_blank" rel="noopener noreferrer">View Virtual Tour</a></p>
            )}
          </div>
        )}

        {/* Additional images grid */}
        {images.length > 1 && (
          <div className="pd-section">
            <h3>More Photos</h3>
            <div className="pd-image-grid">
              {images.slice(1).map((img, i) => (
                <img
                  key={img.id || i}
                  src={img.image_url}
                  alt={`Photo ${i + 2}`}
                  className="pd-image-tile"
                  onClick={() => setLightboxIndex(i + 1)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Seller contact */}
        {seller && property.profile_id && (
          <div className="pd-section pd-seller">
            <h3>Listed By</h3>
            <p className="pd-seller-name">
              {[seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'Member'}
            </p>
            {seller.license_status === 'licensed' && seller.brokerage_name && (
              <p className="pd-seller-brokerage">{seller.brokerage_name}</p>
            )}
            {(seller.city || seller.state) && (
              <p className="pd-seller-location">
                {[seller.city, seller.state].filter(Boolean).join(', ')}
              </p>
            )}
            <Link
              to={`/member/${property.profile_id}?source=property&id=${property.id}`}
              className="btn btn-contact"
            >
              Contact {seller.first_name || 'Member'}
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox — must stop propagation so closing it doesn't also close the parent modal */}
      {lightboxIndex !== null && images.length > 0 && (
        <div
          className="lightbox-overlay"
          onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
        >
          <button
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
          >&times;</button>
          {images.length > 1 && (
            <button
              className="lightbox-nav lightbox-prev"
              onClick={(e) => { e.stopPropagation(); prevLightbox() }}
            >&larr;</button>
          )}
          <img
            src={images[lightboxIndex].image_url}
            alt={`Photo ${lightboxIndex + 1}`}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <button
              className="lightbox-nav lightbox-next"
              onClick={(e) => { e.stopPropagation(); nextLightbox() }}
            >&rarr;</button>
          )}
          <div className="lightbox-counter">{lightboxIndex + 1} / {images.length}</div>
        </div>
      )}
    </div>
  )
}
