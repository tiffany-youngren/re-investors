import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PropertyCard from '../components/PropertyCard'

export default function Buyers() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterCondition, setFilterCondition] = useState('')
  const [filterOccupancy, setFilterOccupancy] = useState('')

  useEffect(() => {
    async function fetchProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_images(*), profiles(first_name, last_name, phone, brokerage_name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching properties:', error.message)
      } else {
        setProperties(data || [])
      }
      setLoading(false)
    }
    fetchProperties()
  }, [])

  const filtered = properties.filter((p) => {
    if (filterType && p.property_type !== filterType) return false
    if (filterCondition && p.condition !== filterCondition) return false
    if (filterOccupancy && p.occupancy !== filterOccupancy) return false
    return true
  })

  return (
    <div className="buyers-page">
      <h1>For Sale</h1>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="filterType">Property Type</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All</option>
            <option value="fixer">Fixer</option>
            <option value="multi-family">Multi-Family</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filterCondition">Condition</label>
          <select
            id="filterCondition"
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
          >
            <option value="">All</option>
            <option value="fixer">Fixer</option>
            <option value="turn-key">Turn-Key</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filterOccupancy">Occupancy</label>
          <select
            id="filterOccupancy"
            value={filterOccupancy}
            onChange={(e) => setFilterOccupancy(e.target.value)}
          >
            <option value="">All</option>
            <option value="vacant">Vacant</option>
            <option value="rented">Rented</option>
            <option value="owner-occupied">Owner-Occupied</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading && <p className="loading">Loading properties...</p>}

      {!loading && filtered.length === 0 && (
        <div className="no-results">
          {properties.length === 0
            ? 'No properties listed yet. Check back soon!'
            : 'No properties match your filters. Try adjusting them.'}
        </div>
      )}

      <div className="property-grid">
        {filtered.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  )
}
