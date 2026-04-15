import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { US_STATES } from '../lib/utils'

const FINANCING_OPTIONS = [
  'Seller financing',
  'Cash at closing',
  'Sub-to',
  'Conventional',
  'FHA',
  'VA',
  'Other',
]

const FHA_BLOCKED_PHRASES = [
  'no children', 'no kids', 'adults only', 'no families',
  'perfect for singles', 'no wheelchairs', 'no disabled',
  'christian neighborhood', 'muslim neighborhood', 'jewish neighborhood',
  'white neighborhood', 'black neighborhood', 'hispanic neighborhood',
  'no section 8', 'no vouchers', 'english only', 'speak english',
  'no foreigners', 'american born', 'no immigrants',
  'men only', 'women only', 'no gay', 'no lesbian',
  'near church', 'walking distance to church',
  'ethnic', 'exclusive community', 'restricted',
]

function checkFHAViolations(text) {
  const lower = text.toLowerCase()
  return FHA_BLOCKED_PHRASES.filter((phrase) => lower.includes(phrase))
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

async function resizeImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function createThumbnail(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

const DRAFT_KEY = 'draft-property-form'

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraftToStorage(data) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
}

function clearDraftStorage() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}

function emptyUnit() {
  return { bedrooms: '', bathrooms: '', sqft: '', rent: '', occupancy: 'vacant' }
}

export default function PropertyForm({ onSaved }) {
  const { user, profile } = useAuth()
  const isLicensed = profile?.license_status === 'licensed'
  const draft = loadDraft()

  const [street, setStreet] = useState(draft?.street || '')
  const [city, setCity] = useState(draft?.city || '')
  const [addrState, setAddrState] = useState(draft?.addrState || '')
  const [zip, setZip] = useState(draft?.zip || '')
  const [price, setPrice] = useState(draft?.price || '')
  const [sellerType, setSellerType] = useState(draft?.sellerType || (isLicensed ? '' : ''))
  const [propertyType, setPropertyType] = useState(draft?.propertyType || '')
  const [numUnits, setNumUnits] = useState(draft?.numUnits || '')
  const [units, setUnits] = useState(draft?.units || [])
  const [occupancyStatus, setOccupancyStatus] = useState(draft?.occupancyStatus || '')
  const [condition, setCondition] = useState(draft?.condition || '')
  const [financing, setFinancing] = useState(draft?.financing || [])
  const [description, setDescription] = useState(draft?.description || '')
  const [repairsNeeded, setRepairsNeeded] = useState(draft?.repairsNeeded || '')
  const [rehabCostEstimate, setRehabCostEstimate] = useState(draft?.rehabCostEstimate || '')
  const [estimatedArv, setEstimatedArv] = useState(draft?.estimatedArv || '')
  const [countyRecordsUrl, setCountyRecordsUrl] = useState(draft?.countyRecordsUrl || '')
  const [virtualTourUrl, setVirtualTourUrl] = useState(draft?.virtualTourUrl || '')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')
  const [fhaWarning, setFhaWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const debounceRef = useRef(null)

  // Generate previews when images change
  useEffect(() => {
    let cancelled = false
    async function gen() {
      const urls = await Promise.all(images.map(createThumbnail))
      if (!cancelled) setPreviews(urls)
    }
    if (images.length > 0) gen()
    else setPreviews([])
    return () => { cancelled = true }
  }, [images])

  // Sync units array when numUnits changes for multi-family
  useEffect(() => {
    if (propertyType === 'multi-family' && numUnits) {
      const count = parseInt(numUnits, 10) || 0
      setUnits((prev) => {
        if (prev.length === count) return prev
        if (prev.length < count) return [...prev, ...Array(count - prev.length).fill(null).map(emptyUnit)]
        return prev.slice(0, count)
      })
    }
  }, [numUnits, propertyType])

  // Debounced draft save
  const flushDraft = useCallback(() => {
    saveDraftToStorage({
      street, city, addrState, zip, price, sellerType, propertyType,
      numUnits, units, occupancyStatus, condition, financing, description,
      repairsNeeded, rehabCostEstimate, estimatedArv, countyRecordsUrl, virtualTourUrl,
    })
  }, [street, city, addrState, zip, price, sellerType, propertyType, numUnits, units, occupancyStatus, condition, financing, description, repairsNeeded, rehabCostEstimate, estimatedArv, countyRecordsUrl, virtualTourUrl])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flushDraft, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [flushDraft])

  useEffect(() => {
    return () => flushDraft()
  }, [flushDraft])

  function handleFinancingChange(option) {
    setFinancing((prev) =>
      prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option]
    )
  }

  function handleDescriptionChange(value) {
    setDescription(value)
    const violations = checkFHAViolations(value)
    setFhaWarning(violations.length > 0
      ? `Warning: Your description may contain Fair Housing Act violations: "${violations.join('", "')}". Please remove these phrases.`
      : '')
  }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files)
    const total = images.length + files.length
    if (total > 10) {
      setError(`Maximum 10 images. You selected ${files.length} but already have ${images.length}.`)
      return
    }
    setImages((prev) => [...prev, ...files])
    setError('')
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDragStart(index) {
    setDragIndex(index)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setImages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  function updateUnit(index, field, value) {
    setUnits((prev) => prev.map((u, i) => i === index ? { ...u, [field]: value } : u))
  }

  function resetForm() {
    clearDraftStorage()
    setStreet('')
    setCity('')
    setAddrState('')
    setZip('')
    setPrice('')
    setSellerType(isLicensed ? '' : '')
    setPropertyType('')
    setNumUnits('')
    setUnits([])
    setOccupancyStatus('')
    setCondition('')
    setFinancing([])
    setDescription('')
    setRepairsNeeded('')
    setRehabCostEstimate('')
    setEstimatedArv('')
    setCountyRecordsUrl('')
    setVirtualTourUrl('')
    setImages([])
    setSubmitting(false)
  }

  function validate() {
    if (!street.trim() || !city.trim() || !addrState || !zip.trim()) {
      return 'All address fields are required.'
    }
    if (!sellerType) return 'Seller type is required.'
    if (!propertyType) return 'Property type is required.'
    if (!occupancyStatus) return 'Occupancy status is required.'
    if (!condition) return 'Condition is required.'
    if (condition === 'fixer' && !repairsNeeded.trim()) {
      return 'Repairs needed is required when condition is fixer.'
    }
    if (images.length < 1) return 'At least 1 image is required.'
    const wordCount = countWords(description)
    if (wordCount > 300) return `Description is ${wordCount} words. Maximum is 300.`
    const violations = checkFHAViolations(description)
    if (violations.length > 0) return 'Description contains Fair Housing Act violations. Please fix before submitting.'
    return null
  }

  async function handleSave(status) {
    setError('')
    if (status === 'published') {
      const validationError = validate()
      if (validationError) { setError(validationError); return }
    }

    setSubmitting(true)

    const fullAddress = `${street.trim()}, ${city.trim()}, ${addrState} ${zip.trim()}`

    const propertyData = {
      user_id: user.id,
      address: fullAddress,
      price: price ? parseFloat(price) : null,
      seller_type: sellerType || null,
      property_type: propertyType || null,
      num_units: propertyType === 'multi-family' && numUnits ? parseInt(numUnits, 10) : null,
      occupancy_status: occupancyStatus || null,
      condition: condition || null,
      financing,
      description: description.trim() || null,
      repairs_needed: repairsNeeded.trim() || null,
      rehab_cost_estimate: rehabCostEstimate ? parseFloat(rehabCostEstimate) : null,
      estimated_arv: estimatedArv ? parseFloat(estimatedArv) : null,
      county_records_url: countyRecordsUrl.trim() || null,
      virtual_tour_url: virtualTourUrl.trim() || null,
      status,
    }

    const { data: property, error: insertError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Save unit details for multi-family
    if (propertyType === 'multi-family' && units.length > 0) {
      const unitRows = units.map((u, i) => ({
        property_id: property.id,
        unit_number: i + 1,
        bedrooms: u.bedrooms ? parseInt(u.bedrooms, 10) : null,
        bathrooms: u.bathrooms ? parseFloat(u.bathrooms) : null,
        sqft: u.sqft ? parseInt(u.sqft, 10) : null,
        rent: u.rent ? parseFloat(u.rent) : null,
        occupancy: u.occupancy || null,
      }))
      await supabase.from('property_units').insert(unitRows)
    }

    // Upload images in display order
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const resized = await resizeImage(file)
      const fileName = `${property.id}/${Date.now()}-${i}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, resized, { contentType: 'image/jpeg' })

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setSubmitting(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)

      await supabase.from('property_images').insert({
        property_id: property.id,
        image_url: publicUrl,
        display_order: i,
      })
    }

    resetForm()
    if (onSaved) onSaved()
  }

  return (
    <div className="form-card">
      <h2>Add a Property Listing</h2>
      <p className="field-note" style={{ marginBottom: 16 }}>
        Property listings can only be posted by members of the Based in Billings Meetup Group, unless expressly approved by the Admin.
      </p>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="street">Street Address *</label>
        <input
          id="street"
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="123 Main St"
        />

        <div className="form-row">
          <div className="form-field" style={{ flex: 3 }}>
            <label htmlFor="addrCity">City *</label>
            <input id="addrCity" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="addrState">State *</label>
            <select id="addrState" value={addrState} onChange={(e) => setAddrState(e.target.value)}>
              <option value="">--</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="addrZip">Zip *</label>
            <input id="addrZip" type="text" value={zip} onChange={(e) => setZip(e.target.value)} maxLength={10} />
          </div>
        </div>

        <label htmlFor="price">Price ($) *</label>
        <input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label htmlFor="sellerType">Seller Type *</label>
        {isLicensed ? (
          <select id="sellerType" value={sellerType} onChange={(e) => setSellerType(e.target.value)}>
            <option value="">Select...</option>
            <option value="selling own property">Selling Own Property</option>
            <option value="wholesaling">Wholesaling</option>
            <option value="listing agent">Listing Agent</option>
          </select>
        ) : (
          <select id="sellerType" value={sellerType} onChange={(e) => setSellerType(e.target.value)}>
            <option value="">Select...</option>
            <option value="selling own property">Selling Own Property</option>
            <option value="wholesaling">Wholesaling</option>
          </select>
        )}

        <label htmlFor="propertyType">Property Type *</label>
        <select id="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
          <option value="">Select...</option>
          <option value="single-family">Single Family</option>
          <option value="multi-family">Multi-Family</option>
          <option value="commercial">Commercial</option>
        </select>

        {propertyType === 'multi-family' && (
          <>
            <label htmlFor="numUnits">Number of Units *</label>
            <input id="numUnits" type="number" min="2" max="50" value={numUnits} onChange={(e) => setNumUnits(e.target.value)} />

            {units.map((unit, i) => (
              <fieldset key={i} className="financing-fieldset" style={{ marginTop: 8 }}>
                <legend>Unit {i + 1}</legend>
                <div className="form-row">
                  <div className="form-field">
                    <label style={{ fontSize: '0.85rem' }}>Beds</label>
                    <input type="number" min="0" value={unit.bedrooms} onChange={(e) => updateUnit(i, 'bedrooms', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: '0.85rem' }}>Baths</label>
                    <input type="number" min="0" step="0.5" value={unit.bathrooms} onChange={(e) => updateUnit(i, 'bathrooms', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: '0.85rem' }}>Sq Ft</label>
                    <input type="number" min="0" value={unit.sqft} onChange={(e) => updateUnit(i, 'sqft', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label style={{ fontSize: '0.85rem' }}>Rent $/mo</label>
                    <input type="number" min="0" value={unit.rent} onChange={(e) => updateUnit(i, 'rent', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label style={{ fontSize: '0.85rem' }}>Occupancy</label>
                    <select value={unit.occupancy} onChange={(e) => updateUnit(i, 'occupancy', e.target.value)}>
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            ))}
          </>
        )}

        <label htmlFor="occupancyStatus">Occupancy Status *</label>
        <select id="occupancyStatus" value={occupancyStatus} onChange={(e) => setOccupancyStatus(e.target.value)}>
          <option value="">Select...</option>
          <option value="vacant">Vacant</option>
          <option value="rented">Rented</option>
          <option value="owner-occupied">Owner-Occupied</option>
        </select>

        <label htmlFor="condition">Condition *</label>
        <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">Select...</option>
          <option value="fixer">Fixer</option>
          <option value="turn-key">Turn-Key</option>
        </select>

        {condition === 'fixer' && (
          <>
            <label htmlFor="repairsNeeded">Repairs Needed *</label>
            <textarea
              id="repairsNeeded"
              rows={3}
              value={repairsNeeded}
              onChange={(e) => setRepairsNeeded(e.target.value)}
              placeholder="Describe what repairs are needed"
            />
          </>
        )}

        <fieldset className="financing-fieldset">
          <legend>Financing Available (select all that apply)</legend>
          {FINANCING_OPTIONS.map((option) => (
            <label key={option} className="checkbox-label">
              <input type="checkbox" checked={financing.includes(option)} onChange={() => handleFinancingChange(option)} />
              {option}
            </label>
          ))}
        </fieldset>

        <label htmlFor="description">Description *</label>
        <textarea id="description" rows={5} value={description} onChange={(e) => handleDescriptionChange(e.target.value)} />
        <p className="field-note">{countWords(description)}/300 words</p>
        {fhaWarning && <p className="warning-msg">{fhaWarning}</p>}

        <label htmlFor="rehabCostEstimate">Rehab Cost Estimate ($)</label>
        <input id="rehabCostEstimate" type="number" min="0" step="0.01" value={rehabCostEstimate} onChange={(e) => setRehabCostEstimate(e.target.value)} />

        <label htmlFor="estimatedArv">Estimated ARV ($)</label>
        <input id="estimatedArv" type="number" min="0" step="0.01" value={estimatedArv} onChange={(e) => setEstimatedArv(e.target.value)} />

        <label htmlFor="countyRecordsUrl">County Records URL</label>
        <input id="countyRecordsUrl" type="url" value={countyRecordsUrl} onChange={(e) => setCountyRecordsUrl(e.target.value)} placeholder="https://..." />

        <label htmlFor="virtualTourUrl">Virtual Tour URL</label>
        <input id="virtualTourUrl" type="url" value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} placeholder="https://..." />

        <label>Property Images (1-10) *</label>
        <input type="file" accept="image/*" multiple onChange={handleImageSelect} />
        <p className="field-note">First image is the primary photo. Drag to reorder.</p>

        {previews.length > 0 && (
          <div className="image-thumb-grid">
            {previews.map((src, i) => (
              <div
                key={i}
                className={`image-thumb-item${dragIndex === i ? ' dragging' : ''}${i === 0 ? ' primary' : ''}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
              >
                <img src={src} alt={`Preview ${i + 1}`} />
                {i === 0 && <span className="image-thumb-badge">Primary</span>}
                <button type="button" className="image-thumb-remove" onClick={() => removeImage(i)}>&times;</button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="form-row" style={{ marginTop: 16, gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="button" className="btn" onClick={() => handleSave('published')} disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}
