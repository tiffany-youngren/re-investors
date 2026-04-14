import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Billings RE Investors</h1>
        <p className="subtitle">A member portal for the Billings, Montana real estate investor meetup group.</p>

        <nav className="home-nav">
          {user ? (
            <>
              {profile?.approved && <Link to="/buyers" className="btn">Buyers</Link>}
              {profile?.approved && <Link to="/sellers" className="btn">Sellers</Link>}
              {profile?.role === 'admin' && <Link to="/admin" className="btn">Admin</Link>}
              <button onClick={async () => { await signOut(); window.location.href = '/'; }} className="btn btn-secondary">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn">Log In</Link>
              <Link to="/login?mode=signup" className="btn btn-secondary">Sign Up</Link>
            </>
          )}
        </nav>
      </header>

      <section className="home-about">
        <h2>What is this?</h2>
        <p>
          This is a private listing platform for members of our Billings RE Investors meetup.
          Once approved, members can browse properties for sale (Buyers page) or list their own
          fixer, multi-family, or commercial properties (Sellers page).
        </p>
      </section>

      <section className="home-disclaimer">
        <h2>Disclaimer</h2>
        <p>
          This is a listing service provided exclusively for meetup members. We are not licensed
          real estate agents and do not provide real estate brokerage services. This platform is
          a marketing avenue for members only. Realtor members and licensed agents are exclusively
          responsible for following all MLS, Realtor association, and state licensing rules and
          regulations.
        </p>
      </section>
    </div>
  )
}
