import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Don't show navbar on public pages or if not logged in
  if (!user || !profile?.approved) return null

  const displayName = profile?.full_name || user?.email || ''

  async function handleLogOut() {
    await signOut()
    window.location.href = '/'
  }

  function isActive(path) {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
  }

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">Billings RE Investors</Link>

        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? 'hamburger open' : 'hamburger'}></span>
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          <Link to="/buyers" className={isActive('/buyers')} onClick={() => setMenuOpen(false)}>For Sale</Link>
          <Link to="/sellers" className={isActive('/sellers')} onClick={() => setMenuOpen(false)}>Sellers</Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className={isActive('/admin')} onClick={() => setMenuOpen(false)}>Admin</Link>
          )}
          <span className="nav-user">{displayName}</span>
          <button onClick={handleLogOut} className="nav-logout">Log Out</button>
        </div>
      </div>
    </nav>
  )
}
