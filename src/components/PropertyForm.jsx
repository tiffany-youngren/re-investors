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

// Parse "{street}, {city}, {ST} {zip}" back into parts
function parseAddress(full) {
  if (!full) return { street: '', city: '', state: '', zip: '' }
  const parts = full.split(',').map((p) => p.trim())
  if (parts.length < 3) return { street: full, city: '', state: '', zip: '' }
  const street = parts[0]
  const city = parts[1]
  const stateZip = parts.slice(2).join(', ').trim()
  const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(.+)$/)
  if (stateZipMatch) {
    return { street, city, state: stateZipMatch[1], zip: stateZipMatch[2] }
  }
  return { street, city, state: '', zip: stateZip }
}

export default function PropertyForm({ onSaved, editingProperty, onCancelEdit }) {
  const { profile } = useAuth()
  const isLicensed = profile?.license_status === 'licensed'
  const isEditing = Boolean(editingProperty)
  // Only use sessionStorage draft for new listings (not edits)
  const draft = isEditing ? null : loadDraft()
  const initial = editingProperty ? {
    ...parseAddress(editingProperty.address),
    addrState: parseAddress(editingProperty.address).state,
    price: editingProperty.price ?? '',
    sellerType: editingProperty.seller_type || '',
    propertyType: editingProperty.property_type || '',
    numUnits: editingProperty.num_units ?? '',
    occupancyStatus: editingProperty.occupancy_status || '',
    condition: editingProperty.condition || '',
    financing: editingProperty.financing || [],
    description: editingProperty.description || '',
    repairsNeeded: editingProperty.repairs_needed || '',
    rehabCostEstimate: editingProperty.rehab_cost_estimate ?? '',
    estimatedArv: editingProperty.estimated_arv ?? '',
    countyRecordsUrl: editingProperty.county_records_url || '',
    virtualTourUrl: editingProperty.virtual_tour_url || '',
  } : (draft || {})

  const [street, setStreet] = useState(initial?.street || '')
  const [city, setCity] = useState(initial?.city || '')
  const [addrState, setAddrState] = useState(initial?.addrState || initial?.state || '')
  const [zip, setZip] = useState(initial?.zip || '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [sellerType, setSellerType] = useState(initial?.sellerType || '')
  const [propertyType, setPropertyType] = useState(initial?.propertyType || '')
  const [numUnits, setNumUnits] = useState(initial?.numUnits ?? '')
  const [units, setUnits] = useState(initial?.units || [])
  const [occupancyStatus, setOccupancyStatus] = useState(initial?.occupancyStatus || '')
  const [condition, setCondition] = useState(initial?.condition || '')
  const [financing, setFinancing] = useState(initial?.financing || [])
  const [description, setDescription] = useState(initial?.description || '')
  const [repairsNeeded, setRepairsNeeded] = useState(initial?.repairsNeeded || '')
  const [rehabCostEstimate, setRehabCostEstimate] = useState(initial?.rehabCostEstimate ?? '')
  const [estimatedArv, setEstimatedArv] = useState(initial?.estimatedArv ?? '')
  const [countyRecordsUrl, setCountyRecordsUrl] = useState(initial?.countyRecordsUrl || '')
  const [virtualTourUrl, setVirtualTourUrl] = useState(initial?.virtualTourUrl || '')
  // Existing images from DB (only when editing)
  const [existingImages, setExistingImages] = useState(
    isEditing
      ? [...(editingProperty.property_images || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      : []
  )
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')
  const [fhaWarning, setFhaWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [copyMenuOpen, setCopyMenuOpen] = useState(null)
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

  // Debounced draft save (only for new listings, not edits)
  const flushDraft = useCallback(() => {
    if (isEditing) return
    saveDraftToStorage({
      street, city, addrState, zip, price, sellerType, propertyType,
      numUnits, units, occupancyStatus, condition, financing, description,
      repairsNeeded, rehabCostEstimate, estimatedArv, countyRecordsUrl, virtualTourUrl,
    })
  }, [isEditing, street, city, addrState, zip, price, sellerType, propertyType, numUnits, units, occupancyStatus, condition, financing, description, repairsNeeded, rehabCostEstimate, estimatedArv, countyRecordsUrl, virtualTourUrl])

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
    const total = existingImages.length + images.length + files.length
    if (total > 10) {
      setError(`Maximum 10 images. You have ${existingImages.length + images.length} and tried to add ${files.length}.`)
      return
    }
    setImages((prev) => [...prev, ...files])
    setError('')
  }

  function removeExistingImage(id) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id))
  }

  function removeNewImage(index) {
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

  function copyUnitTo(sourceIndex, targetIndex) {
    setUnits((prev) => prev.map((u, i) => i === targetIndex ? { ...prev[sourceIndex] } : u))
    setCopyMenuOpen(null)
  }

  function copyUnitToAll(sourceIndex) {
    setUnits((prev) => prev.map((u, i) => i === sourceIndex ? u : { ...prev[sourceIndex] }))
    setCopyMenuOpen(null)
  }

  function resetForm() {
    clearDraftStorage()
    setStreet('')
    setCity('')
    setAddrState('')
    setZip('')
    setPrice('')
    setSellerType('')
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
    setExistingImages([])
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
    if (existingImages.length + images.length < 1) return 'At least 1 image is required.'
    const wordCount = countWords(description)
    if (wordCount > 300) return `Description is ${wordCount} words. Maximum is 300.`
    const violations = checkFHAViolations(description)
    if (violations.length > 0) return 'Description contains Fair Housing Act violations. Please fix before submitting.'
    return null
  }

  async function handleSave(targetStatus) {
    setError('')
    if (targetStatus === 'published') {
      const validationError = validate()
      if (validationError) { setError(validationError); return }
    }

    setSubmitting(true)

    const fullAddress = `${street.trim()}, ${city.trim()}, ${addrState} ${zip.trim()}`

    const propertyData = {
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
      status: targetStatus,
    }

    let propertyId
    if (isEditing) {
      const { error: updateError } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', editingProperty.id)
      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }
      propertyId = editingProperty.id
    } else {
      const { data: property, error: insertError } = await supabase
        .from('properties')
        .insert({ ...propertyData, profile_id: profile.id })
        .select()
        .single()
      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }
      propertyId = property.id
    }

    // Save unit details for multi-family (replace all when editing)
    if (propertyType === 'multi-family' && units.length > 0) {
      if (isEditing) {
        await supabase.from('property_units').delete().eq('property_id', propertyId)
      }
      const unitRows = units.map((u, i) => ({
        property_id: propertyId,
        unit_number: i + 1,
        bedrooms: u.bedrooms ? parseInt(u.bedrooms, 10) : null,
        bathrooms: u.bathrooms ? parseFloat(u.bathrooms) : null,
        sqft: u.sqft ? parseInt(u.sqft, 10) : null,
        rent: u.rent ? parseFloat(u.rent) : null,
        occupancy: u.occupancy || null,
      }))
      await supabase.from('property_units').insert(unitRows)
    }

    // Handle removed existing images (when editing)
    if (isEditing) {
      const originalImageIds = (editingProperty.property_images || []).map((img) => img.id)
      const keptIds = existingImages.map((img) => img.id)
      const removedIds = originalImageIds.filter((id) => !keptIds.includes(id))
      if (removedIds.length > 0) {
        // Get URLs to delete from storage
        const { data: toDelete } = await supabase
          .from('property_images')
          .select('image_url')
          .in('id', removedIds)
        if (toDelete && toDelete.length > 0) {
          const paths = toDelete.map((img) => {
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
        await supabase.from('property_images').delete().in('id', removedIds)
      }

      // Update display_order on existing kept images
      for (let i = 0; i < existingImages.length; i++) {
        await supabase
          .from('property_images')
          .update({ display_order: i })
          .eq('id', existingImages[i].id)
      }
    }

    // Upload new images, continuing display_order after existing
    const startIndex = existingImages.length
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const resized = await resizeImage(file)
      const fileName = `${propertyId}/${Date.now()}-${i}.jpg`

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
        property_id: propertyId,
        image_url: publicUrl,
        display_order: startIndex + i,
      })
    }

    if (!isEditing) resetForm()
    setSubmitting(false)
    if (onSaved) onSaved()
  }

  const isPublishedEdit = isEditing && editingProperty.status === 'published'

  return (
    <div className="form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h2>{isEditing ? 'Edit Property Listing' : 'Add a Property Listing'}</h2>
        {isEditing && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={onCancelEdit}>Cancel</button>
        )}
      </div>
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
                {units.length > 1 && (
                  <div className="unit-copy-wrapper">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCopyMenuOpen(copyMenuOpen === i ? null : i)}
                    >
                      Copy to other units
                    </button>
                    {copyMenuOpen === i && (
                      <div className="unit-copy-menu">
                        <button
                          type="button"
                          className="unit-copy-option"
                          onClick={() => copyUnitToAll(i)}
                        >
                          Apply to all units
                        </button>
                        {units.map((_, j) => j !== i && (
                          <button
                            key={j}
                            type="button"
                            className="unit-copy-option"
                            onClick={() => copyUnitTo(i, j)}
                          >
                            Apply to unit {j + 1}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="unit-copy-option unit-copy-cancel"
                          onClick={() => setCopyMenuOpen(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
        <p className="field-note">First image is the primary photo. Drag new images to reorder.</p>

        {(existingImages.length > 0 || previews.length > 0) && (
          <div className="image-thumb-grid">
            {existingImages.map((img, i) => (
              <div key={`existing-${img.id}`} className={`image-thumb-item${i === 0 ? ' primary' : ''}`}>
                <img src={img.image_url} alt={`Existing ${i + 1}`} />
                {i === 0 && <span className="image-thumb-badge">Primary</span>}
                <button type="button" className="image-thumb-remove" onClick={() => removeExistingImage(img.id)}>&times;</button>
              </div>
            ))}
            {previews.map((src, i) => {
              const overallIndex = existingImages.length + i
              return (
                <div
                  key={`new-${i}`}
                  className={`image-thumb-item${dragIndex === i ? ' dragging' : ''}${overallIndex === 0 ? ' primary' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                >
                  <img src={src} alt={`New ${i + 1}`} />
                  {overallIndex === 0 && <span className="image-thumb-badge">Primary</span>}
                  <button type="button" className="image-thumb-remove" onClick={() => removeNewImage(i)}>&times;</button>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="form-row" style={{ marginTop: 16, gap: 12 }}>
          {isPublishedEdit ? (
            <button type="button" className="btn" onClick={() => handleSave('published')} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" className="btn" onClick={() => handleSave('published')} disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
