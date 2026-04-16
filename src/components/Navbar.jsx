import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Don't render while auth is still loading
  if (loading) return null

  async function handleLogOut() {
    await signOut()
    window.location.href = '/login'
  }

  function isActive(path) {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
  }

  const isLoggedIn = user && profile?.approved

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
          <Link to="/about" className={isActive('/about')} onClick={() => setMenuOpen(false)}>About</Link>
          {isLoggedIn ? (
            <>
              <Link to="/buyers" className={isActive('/buyers')} onClick={() => setMenuOpen(false)}>For Sale</Link>
              <Link to="/buy-boxes" className={isActive('/buy-boxes')} onClick={() => setMenuOpen(false)}>Buy Boxes</Link>
              {profile?.role === 'admin' && (
                <Link to="/admin" className={isActive('/admin')} onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
              <NotificationBell />
              <Link to="/profile" className={`nav-profile-link ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="nav-avatar" />
                ) : (
                  <span className="nav-avatar nav-avatar-placeholder">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                )}
                Profile
              </Link>
              <button onClick={handleLogOut} className="nav-logout">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')} onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link to="/login?mode=signup" className={isActive('/login?mode=signup')} onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
