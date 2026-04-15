import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { displayPhone } from '../lib/utils'

export default function BuyBoxes() {
  const { user } = useAuth()
  const [selectedBox, setSelectedBox] = useState(null)

  const { data: buyBoxes = [], isLoading } = useQuery({
    queryKey: ['buyBoxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buy_boxes')
        .select('*, profiles(first_name, last_name, phone, email, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  function formatPrice(num) {
    return '$' + Number(num).toLocaleString()
  }

  function closeModal() {
    setSelectedBox(null)
  }

  return (
    <div className="buyboxes-page">
      <div className="buyboxes-header">
        <h1>Buy Boxes</h1>
        {user && (
          <Link to="/buy-box/new" className="btn">Add Buy Box</Link>
        )}
      </div>

      {isLoading && <p className="loading">Loading buy boxes...</p>}

      {!isLoading && buyBoxes.length === 0 && (
        <div className="no-results">
          No buy boxes posted yet. Be the first to share what you're looking for!
        </div>
      )}

      <div className="buybox-grid">
        {buyBoxes.map((box) => (
          <div key={box.id} className="buybox-card" onClick={() => setSelectedBox(box)}>
            <div className="buybox-card-top">
              {box.profiles?.avatar_url ? (
                <img src={box.profiles.avatar_url} alt="" className="buybox-avatar" />
              ) : (
                <span className="buybox-avatar buybox-avatar-placeholder">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              )}
              <span className="buybox-buyer-name">{box.profiles?.first_name || 'Member'}</span>
              {box.user_id === user?.id && (
                <Link
                  to={`/buy-box/${box.id}/edit`}
                  className="buybox-edit-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit
                </Link>
              )}
            </div>
            <div className="buybox-card-body">
              <p className="buybox-areas">
                {(box.areas_looking || []).map((a) => `${a.city}, ${a.state}`).join(' · ')}
              </p>
              <p className="buybox-types">
                {(box.property_types || []).map((t) => t.replace('-', ' ')).join(', ')}
              </p>
              <p className="buybox-price-range">
                {box.price_min ? formatPrice(box.price_min) + ' – ' : 'Up to '}{formatPrice(box.price_max)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedBox && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>

            <div className="buybox-modal-header">
              {selectedBox.profiles?.avatar_url ? (
                <img src={selectedBox.profiles.avatar_url} alt="" className="buybox-avatar-lg" />
              ) : (
                <span className="buybox-avatar-lg buybox-avatar-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              )}
              <div>
                <h2 style={{ margin: 0 }}>
                  {selectedBox.profiles?.first_name} {selectedBox.profiles?.last_name}
                </h2>
                {selectedBox.profiles?.phone && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{displayPhone(selectedBox.profiles.phone)}</p>
                )}
                {selectedBox.profiles?.email && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem' }}>
                    <a href={`mailto:${selectedBox.profiles.email}`} style={{ color: 'var(--accent)' }}>
                      {selectedBox.profiles.email}
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div className="buybox-modal-section">
              <h3>Areas Looking</h3>
              <p>{(selectedBox.areas_looking || []).map((a) => `${a.city}, ${a.state}`).join(' · ')}</p>
            </div>

            <div className="buybox-modal-section">
              <h3>Property Types</h3>
              <p style={{ textTransform: 'capitalize' }}>
                {(selectedBox.property_types || []).map((t) => t.replace('-', ' ')).join(', ')}
              </p>
            </div>

            {(selectedBox.year_built_min || selectedBox.year_built_max) && (
              <div className="buybox-modal-section">
                <h3>Year Built</h3>
                <p>
                  {selectedBox.year_built_min && selectedBox.year_built_max
                    ? `${selectedBox.year_built_min} – ${selectedBox.year_built_max}`
                    : selectedBox.year_built_min
                      ? `${selectedBox.year_built_min}+`
                      : `Up to ${selectedBox.year_built_max}`}
                </p>
              </div>
            )}

            <div className="buybox-modal-section">
              <h3>Price Range</h3>
              <p>{selectedBox.price_min ? formatPrice(selectedBox.price_min) + ' – ' : 'Up to '}{formatPrice(selectedBox.price_max)}</p>
            </div>

            {(selectedBox.cap_rate || selectedBox.coc_return || selectedBox.noi) && (
              <div className="buybox-modal-section">
                <h3>Expected Returns</h3>
                <div className="buybox-returns">
                  {selectedBox.cap_rate && <span>Cap Rate: {selectedBox.cap_rate}%</span>}
                  {selectedBox.coc_return && <span>CoC Return: {selectedBox.coc_return}%</span>}
                  {selectedBox.noi && <span>NOI: ${Number(selectedBox.noi).toLocaleString()}</span>}
                </div>
              </div>
            )}

            {selectedBox.description && (
              <div className="buybox-modal-section">
                <h3>Description</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedBox.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
