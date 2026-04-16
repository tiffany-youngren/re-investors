import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { US_STATES } from '../lib/utils'

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single-family', label: 'Single-Family' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
]

function getDraftKey(id) {
  return id ? `draft-buybox-form-${id}` : 'draft-buybox-form'
}

function loadDraft(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraft(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)) } catch {}
}

function clearDraft(key) {
  try { sessionStorage.removeItem(key) } catch {}
}

export default function BuyBoxForm() {
  const { user, profile } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)
  const draftKey = getDraftKey(id)
  const draft = loadDraft(draftKey)

  const [areas, setAreas] = useState(draft?.areas || [])
  const [newCity, setNewCity] = useState(draft?.newCity || '')
  const [newState, setNewState] = useState(draft?.newState || '')
  const [propertyTypes, setPropertyTypes] = useState(draft?.propertyTypes || [])
  const [yearBuiltMin, setYearBuiltMin] = useState(draft?.yearBuiltMin ?? '')
  const [yearBuiltMax, setYearBuiltMax] = useState(draft?.yearBuiltMax ?? '')
  const [priceMin, setPriceMin] = useState(draft?.priceMin ?? '')
  const [priceMax, setPriceMax] = useState(draft?.priceMax ?? '')
  const [capRate, setCapRate] = useState(draft?.capRate ?? '')
  const [cocReturn, setCocReturn] = useState(draft?.cocReturn ?? '')
  const [noi, setNoi] = useState(draft?.noi ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [error, setError] = useState(null)
  const [prefilled, setPrefilled] = useState(false)
  const debounceRef = useRef(null)
  // Set to true on successful save so the unmount/debounce flush doesn't
  // re-save the form data back to sessionStorage after we've cleared it.
  const savedRef = useRef(false)

  // Debounced draft save
  const flushDraft = useCallback(() => {
    if (savedRef.current) return
    saveDraft(draftKey, {
      areas, newCity, newState, propertyTypes,
      yearBuiltMin, yearBuiltMax, priceMin, priceMax,
      capRate, cocReturn, noi, description,
    })
  }, [draftKey, areas, newCity, newState, propertyTypes, yearBuiltMin, yearBuiltMax, priceMin, priceMax, capRate, cocReturn, noi, description])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flushDraft, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [flushDraft])

  // Flush on unmount (skipped after a successful save)
  useEffect(() => {
    return () => flushDraft()
  }, [flushDraft])

  // Fetch existing buy box count
  const { data: buyBoxCount = 0 } = useQuery({
    queryKey: ['buyBoxCount', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('buy_boxes')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
      if (error) throw error
      return count
    },
    enabled: !!profile?.id,
  })

  // Fetch existing buy box when editing
  const { data: existingBox, isLoading: loadingBox } = useQuery({
    queryKey: ['buyBox', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buy_boxes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEditing,
  })

  // Pre-fill form when editing (only if no draft exists)
  useEffect(() => {
    if (existingBox && !prefilled && !draft) {
      setAreas(existingBox.areas_looking || [])
      setPropertyTypes(existingBox.property_types || [])
      setYearBuiltMin(existingBox.year_built_min ?? '')
      setYearBuiltMax(existingBox.year_built_max ?? '')
      setPriceMin(existingBox.price_min ?? '')
      setPriceMax(existingBox.price_max ?? '')
      setCapRate(existingBox.expected_cap_rate ?? '')
      setCocReturn(existingBox.expected_coc_return ?? '')
      setNoi(existingBox.expected_noi ?? '')
      setDescription(existingBox.description ?? '')
      setPrefilled(true)
    }
  }, [existingBox, prefilled, draft])

  // Check ownership when editing
  if (isEditing && existingBox && existingBox.profile_id !== profile?.id) {
    return (
      <div className="buybox-form-page">
        <h1>Not Authorized</h1>
        <p>You can only edit your own buy boxes.</p>
      </div>
    )
  }

  const saveMutation = useMutation({
    mutationFn: async (buyBoxData) => {
      if (isEditing) {
        const { error } = await supabase
          .from('buy_boxes')
          .update(buyBoxData)
          .eq('id', id)
        if (error) throw error
      } else {
        // New buy boxes require admin approval before showing publicly
        const { error } = await supabase
          .from('buy_boxes')
          .insert({ ...buyBoxData, profile_id: profile.id, approved: false })
        if (error) throw error
      }
    },
    onSuccess: () => {
      // Block further draft saves before clearing — the unmount/debounce
      // flush would otherwise re-save form data after navigation.
      savedRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearDraft(draftKey)
      queryClient.invalidateQueries({ queryKey: ['buyBoxes'] })
      queryClient.invalidateQueries({ queryKey: ['buyBoxCount'] })
      navigate('/buy-boxes')
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  function addArea() {
    const city = newCity.trim()
    const state = newState.trim()
    if (!city || !state) return
    setAreas([...areas, { city, state }])
    setNewCity('')
    setNewState('')
  }

  function removeArea(index) {
    setAreas(areas.filter((_, i) => i !== index))
  }

  function togglePropertyType(type) {
    setPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (areas.length === 0) {
      setError('Add at least one area.')
      return
    }
    if (propertyTypes.length === 0) {
      setError('Select at least one property type.')
      return
    }
    if (!priceMax) {
      setError('Maximum price is required.')
      return
    }
    if (priceMin && Number(priceMin) > Number(priceMax)) {
      setError('Min price cannot be greater than max price.')
      return
    }

    saveMutation.mutate({
      areas_looking: areas,
      property_types: propertyTypes,
      year_built_min: yearBuiltMin ? Number(yearBuiltMin) : null,
      year_built_max: yearBuiltMax ? Number(yearBuiltMax) : null,
      price_min: priceMin ? Number(priceMin) : null,
      price_max: Number(priceMax),
      expected_cap_rate: capRate ? Number(capRate) : null,
      expected_coc_return: cocReturn ? Number(cocReturn) : null,
      expected_noi: noi ? Number(noi) : null,
      description: description.trim() || null,
    })
  }

  // Block new buy box if already at 4
  if (!isEditing && buyBoxCount >= 4) {
    return (
      <div className="buybox-form-page">
        <h1>Buy Box Limit Reached</h1>
        <div className="form-card">
          <p>You already have 4 buy boxes, which is the maximum. Edit or delete an existing one before adding another.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/buy-boxes')}>
            Back to Buy Boxes
          </button>
        </div>
      </div>
    )
  }

  if (isEditing && loadingBox) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="buybox-form-page">
      <h1>{isEditing ? 'Edit Buy Box' : 'New Buy Box'}</h1>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          {/* Areas */}
          <label>Areas Looking</label>
          <div className="investment-areas">
            {areas.map((area, i) => (
              <div key={i} className="investment-area-item">
                <span>{area.city}, {area.state}</span>
                <button type="button" className="remove-img-btn" onClick={() => removeArea(i)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="form-row investment-area-add">
            <div className="form-field" style={{ flex: 3 }}>
              <input
                type="text"
                placeholder="City"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <select value={newState} onChange={(e) => setNewState(e.target.value)}>
                <option value="">State</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addArea}>Add</button>
          </div>

          {/* Property Types */}
          <fieldset className="financing-fieldset">
            <legend>Property Types</legend>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={propertyTypes.includes(opt.value)}
                  onChange={() => togglePropertyType(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          {/* Year Built Range */}
          <label>Year Built Range</label>
          <div className="form-row">
            <div className="form-field">
              <input
                type="number"
                placeholder="Min year"
                value={yearBuiltMin}
                onChange={(e) => setYearBuiltMin(e.target.value)}
              />
            </div>
            <div className="form-field">
              <input
                type="number"
                placeholder="Max year"
                value={yearBuiltMax}
                onChange={(e) => setYearBuiltMax(e.target.value)}
              />
            </div>
          </div>

          {/* Price Range */}
          <label>Price Range</label>
          <div className="form-row">
            <div className="form-field">
              <input
                type="number"
                placeholder="Min price"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div className="form-field">
              <input
                type="number"
                placeholder="Max price *"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Expected Returns */}
          <label>Expected Returns</label>
          <div className="form-row">
            <div className="form-field">
              <label style={{ fontSize: '0.85rem' }}>Cap Rate %</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 8.5"
                value={capRate}
                onChange={(e) => setCapRate(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '0.85rem' }}>CoC Return %</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12"
                value={cocReturn}
                onChange={(e) => setCocReturn(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '0.85rem' }}>NOI $</label>
              <input
                type="number"
                placeholder="e.g. 24000"
                value={noi}
                onChange={(e) => setNoi(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <label>Description</label>
          <textarea
            rows={3}
            maxLength={300}
            placeholder="2-3 sentences about what you're looking for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="field-note">{description.length}/300 characters</p>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Buy Box' : 'Save Buy Box'}
          </button>
        </form>
      </div>
    </div>
  )
}
