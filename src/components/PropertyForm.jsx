import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.85
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PropertyForm({ onSaved }) {
  const { user, profile } = useAuth()
  const isLicensed = profile?.license_status === 'Licensed in Montana'

  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [sellerType, setSellerType] = useState(isLicensed ? '' : 'selling own property')
  const [propertyType, setPropertyType] = useState('')
  const [numUnits, setNumUnits] = useState('')
  const [occupancy, setOccupancy] = useState('')
  const [condition, setCondition] = useState('')
  const [financing, setFinancing] = useState([])
  const [description, setDescription] = useState('')
  const [estimatedArv, setEstimatedArv] = useState('')
  const [virtualTourUrl, setVirtualTourUrl] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [fhaWarning, setFhaWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleFinancingChange(option) {
    setFinancing((prev) =>
      prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option]
    )
  }

  function handleDescriptionChange(value) {
    setDescription(value)
    const violations = checkFHAViolations(value)
    if (violations.length > 0) {
      setFhaWarning(
        `Warning: Your description may contain Fair Housing Act violations: "${violations.join('", "')}". Please remove these phrases.`
      )
    } else {
      setFhaWarning('')
    }
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (images.length < 1) {
      setError('At least 1 image is required.')
      return
    }

    const wordCount = countWords(description)
    if (wordCount > 300) {
      setError(`Description is ${wordCount} words. Maximum is 300.`)
      return
    }

    const violations = checkFHAViolations(description)
    if (violations.length > 0) {
      setError('Description contains Fair Housing Act violations. Please fix before submitting.')
      return
    }

    setSubmitting(true)

    // Insert the property record
    const propertyData = {
      user_id: user.id,
      address: address.trim(),
      price: parseFloat(price),
      seller_type: sellerType,
      property_type: propertyType,
      num_units: propertyType === 'multi-family' ? parseInt(numUnits, 10) : null,
      occupancy,
      condition,
      financing,
      description: description.trim(),
      estimated_arv: estimatedArv ? parseFloat(estimatedArv) : null,
      virtual_tour_url: virtualTourUrl.trim() || null,
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

    // Upload images
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

      // Save reference in property_images table
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)

      await supabase.from('property_images').insert({
        property_id: property.id,
        image_url: publicUrl,
        sort_order: i,
      })
    }

    // Reset form
    setAddress('')
    setPrice('')
    setSellerType(isLicensed ? '' : 'selling own property')
    setPropertyType('')
    setNumUnits('')
    setOccupancy('')
    setCondition('')
    setFinancing([])
    setDescription('')
    setEstimatedArv('')
    setVirtualTourUrl('')
    setImages([])
    setSubmitting(false)

    if (onSaved) onSaved()
  }

  return (
    <div className="form-card">
      <h2>Add a Property Listing</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="address">Address</label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <label htmlFor="price">Price ($)</label>
        <input
          id="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <label htmlFor="sellerType">Seller Type</label>
        {isLicensed ? (
          <select
            id="sellerType"
            value={sellerType}
            onChange={(e) => setSellerType(e.target.value)}
            required
          >
            <option value="">Select...</option>
            <option value="wholesaling">Wholesaling</option>
            <option value="listing agent">Listing Agent</option>
            <option value="selling own property">Selling Own Property</option>
          </select>
        ) : (
          <select id="sellerType" value="selling own property" disabled>
            <option value="selling own property">Selling Own Property</option>
          </select>
        )}
        {!isLicensed && (
          <p className="field-note">Unlicensed members can only list their own properties.</p>
        )}

        <label htmlFor="propertyType">Property Type</label>
        <select
          id="propertyType"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          required
        >
          <option value="">Select...</option>
          <option value="fixer">Fixer</option>
          <option value="multi-family">Multi-Family</option>
          <option value="commercial">Commercial</option>
        </select>

        {propertyType === 'multi-family' && (
          <>
            <label htmlFor="numUnits">Number of Units</label>
            <input
              id="numUnits"
              type="number"
              min="2"
              value={numUnits}
              onChange={(e) => setNumUnits(e.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="occupancy">Occupancy Status</label>
        <select
          id="occupancy"
          value={occupancy}
          onChange={(e) => setOccupancy(e.target.value)}
          required
        >
          <option value="">Select...</option>
          <option value="vacant">Vacant</option>
          <option value="rented">Rented</option>
          <option value="owner-occupied">Owner-Occupied</option>
        </select>

        <label htmlFor="condition">Condition</label>
        <select
          id="condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          required
        >
          <option value="">Select...</option>
          <option value="fixer">Fixer</option>
          <option value="turn-key">Turn-Key</option>
        </select>

        <fieldset className="financing-fieldset">
          <legend>Financing Available (select all that apply)</legend>
          {FINANCING_OPTIONS.map((option) => (
            <label key={option} className="checkbox-label">
              <input
                type="checkbox"
                checked={financing.includes(option)}
                onChange={() => handleFinancingChange(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={5}
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          required
        />
        <p className="field-note">
          {countWords(description)}/300 words
        </p>
        {fhaWarning && <p className="warning-msg">{fhaWarning}</p>}

        <label htmlFor="estimatedArv">Estimated ARV (optional)</label>
        <input
          id="estimatedArv"
          type="number"
          min="0"
          step="0.01"
          value={estimatedArv}
          onChange={(e) => setEstimatedArv(e.target.value)}
        />

        <label htmlFor="virtualTourUrl">Virtual Tour URL (optional)</label>
        <input
          id="virtualTourUrl"
          type="url"
          value={virtualTourUrl}
          onChange={(e) => setVirtualTourUrl(e.target.value)}
          placeholder="https://..."
        />

        <label>Property Images (1-10)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
        />
        {images.length > 0 && (
          <div className="image-preview-list">
            {images.map((file, i) => (
              <div key={i} className="image-preview-item">
                <span>{file.name}</span>
                <button type="button" className="remove-img-btn" onClick={() => removeImage(i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Add Listing'}
        </button>
      </form>
    </div>
  )
}
