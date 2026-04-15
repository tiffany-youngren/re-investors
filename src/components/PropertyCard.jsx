import { useState } from 'react'
import { displayPhone } from '../lib/utils'

export default function PropertyCard({ property }) {
  const [expanded, setExpanded] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)
  const images = property.property_images || []
  const seller = property.profiles

  return (
    <div className="property-card">
      {/* Thumbnail / summary */}
      <div className="pc-summary" onClick={() => setExpanded(!expanded)}>
        {images.length > 0 ? (
          <img
            src={images[0].image_url}
            alt={property.address}
            className="pc-thumb"
          />
        ) : (
          <div className="pc-thumb pc-no-image">No Image</div>
        )}
        <div className="pc-info">
          <h3>{property.address}</h3>
          <p className="pc-price">${Number(property.price).toLocaleString()}</p>
          <p className="pc-details">
            {property.property_type}
            {property.property_type === 'multi-family' && property.num_units
              ? ` (${property.num_units} units)`
              : ''}
            {' · '}{property.condition}
            {' · '}{property.occupancy_status}
          </p>
          <p className="pc-meta">
            {property.seller_type}
            {property.financing?.length > 0 && (
              <> · {property.financing.join(', ')}</>
            )}
          </p>
        </div>
        <span className="pc-expand-icon">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail view */}
      {expanded && (
        <div className="pc-detail">
          {/* Image gallery */}
          {images.length > 0 && (
            <div className="pc-gallery">
              <img
                src={images[currentImage].image_url}
                alt={`${property.address} - photo ${currentImage + 1}`}
                className="pc-gallery-img"
              />
              {images.length > 1 && (
                <div className="pc-gallery-nav">
                  <button
                    onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                    className="pc-gallery-btn"
                  >
                    ← Prev
                  </button>
                  <span>{currentImage + 1} / {images.length}</span>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                    className="pc-gallery-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="pc-description">
            <h4>Description</h4>
            <p>{property.description}</p>
          </div>

          {/* Repairs & Costs */}
          {property.repairs_needed && (
            <div className="pc-description">
              <h4>Repairs Needed</h4>
              <p>{property.repairs_needed}</p>
            </div>
          )}

          {/* Extra details */}
          <div className="pc-extras">
            {property.rehab_cost_estimate && (
              <p><strong>Rehab Cost Estimate:</strong> ${Number(property.rehab_cost_estimate).toLocaleString()}</p>
            )}
            {property.estimated_arv && (
              <p><strong>Estimated ARV:</strong> ${Number(property.estimated_arv).toLocaleString()}</p>
            )}
            {property.county_records_url && (
              <p>
                <strong>County Records:</strong>{' '}
                <a href={property.county_records_url} target="_blank" rel="noopener noreferrer">View Records</a>
              </p>
            )}
            {property.virtual_tour_url && (
              <p>
                <strong>Virtual Tour:</strong>{' '}
                <a href={property.virtual_tour_url} target="_blank" rel="noopener noreferrer">
                  View Tour
                </a>
              </p>
            )}
          </div>

          {/* Seller contact */}
          {seller && (
            <div className="pc-seller">
              <h4>Listed by</h4>
              <p>{[seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'Unknown'}</p>
              {seller.phone && <p>{displayPhone(seller.phone)}</p>}
              {seller.brokerage_name && (
                <p className="pc-brokerage">{seller.brokerage_name}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
