export default function PropertyCard({ property, onClick }) {
  const images = [...(property.property_images || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  )

  return (
    <div className="property-card">
      <div className="pc-summary" onClick={onClick}>
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
            {property.condition && <> · {property.condition}</>}
            {property.occupancy_status && <> · {property.occupancy_status}</>}
          </p>
          <p className="pc-meta">
            {property.seller_type}
            {property.financing?.length > 0 && (
              <> · {property.financing.join(', ')}</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
