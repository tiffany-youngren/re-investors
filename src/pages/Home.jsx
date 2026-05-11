import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, profile, loading, roleLoading } = useAuth()
  const authResolved = !loading && !roleLoading
  const isApprovedMember = authResolved && user && profile?.approved
  const isAwaitingApproval = authResolved && user && !profile?.approved

  return (
    <>
      {/* Google Fonts for FORGE brand typography */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Playfair+Display:ital,wght@1,400;1,500;1,600&family=Lato:wght@300;400;700&display=swap"
        rel="stylesheet"
      />

      <div className="bbri-home">
        {/* ============ HERO ============ */}
        <section className="bbri-hero">
          <div className="bbri-hero-bg" aria-hidden="true">
            <div className="bbri-hero-rimrocks" />
            <div className="bbri-hero-glow" />
            <div className="bbri-hero-grain" />
          </div>

          <div className="bbri-hero-inner">
            <div className="bbri-hero-divider" aria-hidden="true" />
            <span className="bbri-eyebrow">Based in Billings · Since 2021</span>

            <h1 className="bbri-hero-title">
              <span className="bbri-hero-title-main">BILLINGS</span>
              <span className="bbri-hero-title-script">real estate investors</span>
            </h1>

            <p className="bbri-hero-tag">Iron sharpens iron.</p>

            <p className="bbri-hero-lede">
              A private monthly meetup and member portal for active real estate
              investors in Billings, Montana — share deals, post buy boxes,
              and build your portfolio alongside people who get it.
            </p>

            <div className="bbri-cta-row">
              {authResolved && !user && (
                <>
                  <Link to="/login?mode=signup" className="bbri-btn bbri-btn-primary">
                    Apply for Membership
                  </Link>
                  <Link to="/login" className="bbri-btn bbri-btn-ghost">
                    Log In
                  </Link>
                </>
              )}
              {isAwaitingApproval && (
                <Link to="/pending" className="bbri-btn bbri-btn-primary">
                  Check Approval Status
                </Link>
              )}
              {isApprovedMember && (
                <>
                  <Link to="/buyers" className="bbri-btn bbri-btn-primary">
                    Browse For Sale
                  </Link>
                  <Link to="/buy-boxes" className="bbri-btn bbri-btn-ghost">
                    View Buy Boxes
                  </Link>
                </>
              )}
            </div>

            <ul className="bbri-hero-meta" aria-label="Meetup details">
              <li><span className="bbri-meta-dot" aria-hidden="true" /> 2nd Tuesday Monthly</li>
              <li><span className="bbri-meta-dot" aria-hidden="true" /> 5:30 PM · Local Restaurant</li>
              <li><span className="bbri-meta-dot" aria-hidden="true" /> Membership is Free</li>
            </ul>
          </div>
        </section>

        {/* ============ THE GROUP ============ */}
        <section className="bbri-section bbri-section-light">
          <div className="bbri-section-inner">
            <span className="bbri-section-eyebrow">The Group</span>
            <h2 className="bbri-section-title">
              Where Billings investors <em>actually</em> connect.
            </h2>

            <div className="bbri-prose">
              <p>
                Meet with area real estate investors as we visit with one another,
                share what's working, swap honest challenges, and figure out how
                the group can help you. Meetings are usually held the
                <strong> 2nd Tuesday of each month at 5:30 PM </strong>
                at a local restaurant. There's no cost to join — you cover your
                own meals and any costs at events.
              </p>
              <p>
                This is the <em>Based in Billings — Real Estate Investor Group.</em>
                We've been having dinner meetings together since August 2021,
                and in summer we usually add 2 family-friendly potluck events.
              </p>
            </div>

            <div className="bbri-pillars">
              <div className="bbri-pillar">
                <div className="bbri-pillar-mark">01</div>
                <h3>Membership is free</h3>
                <p>No dues, no upsells. Bring yourself and an appetite for honest conversation.</p>
              </div>
              <div className="bbri-pillar">
                <div className="bbri-pillar-mark">02</div>
                <h3>Active investors only</h3>
                <p>You must be an active real estate investor — or committed to closing a property within 6 months.</p>
              </div>
              <div className="bbri-pillar">
                <div className="bbri-pillar-mark">03</div>
                <h3>Based right here</h3>
                <p>Built to keep Billings investors in the know — local market, local relationships, local wins.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ THE PORTAL ============ */}
        <section className="bbri-section bbri-section-dark">
          <div className="bbri-section-inner">
            <span className="bbri-section-eyebrow bbri-eyebrow-gold">The Portal</span>
            <h2 className="bbri-section-title bbri-section-title-light">
              A private listing platform <em>for members only.</em>
            </h2>

            <p className="bbri-prose bbri-prose-light">
              Once approved, members get access to a private listing platform built
              for the way our group actually does deals — no public MLS noise,
              just members helping members move properties and find their next one.
            </p>

            <div className="bbri-features">
              <div className="bbri-feature">
                <div className="bbri-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-7h4v7h4a1 1 0 001-1V10" />
                  </svg>
                </div>
                <h3>For Sale</h3>
                <p>Browse fixers, multi-family, and commercial properties listed by other members.</p>
              </div>
              <div className="bbri-feature">
                <div className="bbri-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 4v5M16 4v5" />
                  </svg>
                </div>
                <h3>Buy Boxes</h3>
                <p>Post 1–4 buy boxes so the group knows exactly what you're shopping for.</p>
              </div>
              <div className="bbri-feature">
                <div className="bbri-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <h3>Members</h3>
                <p>Connect directly with other vetted investors — licensed and unlicensed welcome.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOSTS ============ */}
        <section className="bbri-section bbri-section-cream">
          <div className="bbri-section-inner bbri-hosts">
            <span className="bbri-section-eyebrow">Your Hosts</span>
            <h2 className="bbri-section-title">
              <em>Duane &amp; Tiffany</em> Youngren
            </h2>
            <p className="bbri-prose">
              We host this group to connect, create synergy, and keep Billings
              investors sharper — so our community has better opportunities
              and stronger relationships. We'll see you at the next meetup.
            </p>
          </div>
        </section>

        {/* ============ CTA ============ */}
        {!isApprovedMember && (
          <section className="bbri-section bbri-section-cta">
            <div className="bbri-section-inner bbri-cta-block">
              <h2 className="bbri-section-title bbri-section-title-light">
                Ready to join us?
              </h2>
              <p className="bbri-prose bbri-prose-light">
                Apply for membership — admin will verify your investor status and
                meetup attendance, then unlock the portal.
              </p>
              <div className="bbri-cta-row bbri-cta-row-center">
                {!user && (
                  <>
                    <Link to="/login?mode=signup" className="bbri-btn bbri-btn-primary">
                      Apply for Membership
                    </Link>
                    <Link to="/login" className="bbri-btn bbri-btn-ghost-light">
                      Log In
                    </Link>
                  </>
                )}
                {isAwaitingApproval && (
                  <Link to="/pending" className="bbri-btn bbri-btn-primary">
                    Check Approval Status
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============ DISCLAIMER ============ */}
        <section className="bbri-disclaimer">
          <div className="bbri-section-inner">
            <p>
              <strong>Disclaimer.</strong> This is a listing service provided
              exclusively for meetup members. We are not licensed real estate
              agents and do not provide real estate brokerage services. This
              platform is a marketing avenue for members only. Realtor members
              and licensed agents are exclusively responsible for following all
              MLS, Realtor association, and state licensing rules and regulations.
            </p>
          </div>
        </section>
      </div>

      {/* ============ SCOPED STYLES ============ */}
      <style>{`
        .bbri-home {
          /* FORGE Billings brand tokens — blue-forward variant */
          --charcoal: #0F1B2A;          /* deep navy replacing charcoal */
          --charcoal-soft: #1A2D43;
          --cream: #F0EBE3;
          --cream-warm: #E8E0D2;
          --burnt-orange: #D45D00;
          --warm-amber: #B87333;
          --montana-sky: #4A6C8C;
          --montana-sky-deep: #2E4A6B;
          --gold-foil: #C9B068;
          --gold-foil-soft: #D9C285;

          --font-display: 'Montserrat', system-ui, sans-serif;
          --font-script: 'Playfair Display', Georgia, serif;
          --font-body: 'Lato', system-ui, sans-serif;

          font-family: var(--font-body);
          color: var(--charcoal);
          line-height: 1.6;

          /* Break out of the #root container's max-width 960px + side padding 20px */
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          margin-top: -20px;
          margin-bottom: -20px;
        }

        .bbri-home * { box-sizing: border-box; }
        .bbri-home p { margin: 0 0 1em; }
        .bbri-home p:last-child { margin-bottom: 0; }

        /* ===== HERO ===== */
        .bbri-hero {
          position: relative;
          min-height: 92vh;
          background: var(--charcoal);
          color: var(--cream);
          overflow: hidden;
          display: flex;
          align-items: center;
          padding: 80px 24px 64px;
        }

        .bbri-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        /* Blue-hour / golden-hour atmospheric blend */
        .bbri-hero-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 78% 30%, rgba(212, 93, 0, 0.32) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 25% 25%, rgba(201, 176, 104, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(74, 108, 140, 0.45) 0%, transparent 65%),
            linear-gradient(180deg, #0A1422 0%, #142844 35%, #1F3A5C 70%, #2A4A6E 100%);
        }

        /* Layered Rimrocks silhouettes — blue night ridges with warm rim light */
        .bbri-hero-rimrocks {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 55%;
        }

        .bbri-hero-rimrocks::before,
        .bbri-hero-rimrocks::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
        }

        /* Front Rimrocks silhouette - deepest */
        .bbri-hero-rimrocks::before {
          height: 32%;
          background: linear-gradient(180deg, #06101C 0%, #030812 100%);
          clip-path: polygon(
            0% 100%, 0% 60%,
            4% 55%, 9% 62%, 14% 50%, 19% 58%, 24% 45%, 30% 52%,
            36% 40%, 42% 48%, 48% 35%, 54% 44%, 60% 38%, 66% 46%,
            72% 32%, 78% 42%, 84% 36%, 90% 48%, 95% 40%, 100% 50%,
            100% 100%
          );
        }

        /* Back Rimrocks silhouette - mid blue */
        .bbri-hero-rimrocks::after {
          height: 48%;
          background: linear-gradient(180deg, #1B3450 0%, #0F2238 100%);
          opacity: 0.9;
          clip-path: polygon(
            0% 100%, 0% 70%,
            6% 65%, 12% 72%, 20% 60%, 28% 68%,
            36% 55%, 44% 65%, 52% 50%, 60% 62%,
            68% 48%, 76% 60%, 84% 54%, 92% 66%, 100% 58%,
            100% 100%
          );
          z-index: -1;
        }

        /* Subtle film grain for texture */
        .bbri-hero-grain {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          pointer-events: none;
        }

        .bbri-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
          padding: 0 16px;
        }

        .bbri-hero-divider {
          width: 56px;
          height: 2px;
          background: var(--burnt-orange);
          margin-bottom: 24px;
        }

        .bbri-eyebrow {
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold-foil);
          display: block;
          margin-bottom: 24px;
        }

        .bbri-hero-title {
          font-family: var(--font-display);
          margin: 0 0 16px;
          line-height: 0.95;
        }

        .bbri-hero-title-main {
          display: block;
          font-weight: 900;
          font-size: clamp(2.75rem, 9vw, 6rem);
          letter-spacing: 0.04em;
          color: var(--cream);
          text-transform: uppercase;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        }

        .bbri-hero-title-script {
          display: block;
          font-family: var(--font-script);
          font-style: italic;
          font-weight: 500;
          font-size: clamp(1.4rem, 4.5vw, 2.5rem);
          color: var(--burnt-orange);
          letter-spacing: 0.01em;
          margin-top: 8px;
          line-height: 1.1;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .bbri-hero-tag {
          font-family: var(--font-script);
          font-style: italic;
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--gold-foil-soft);
          margin: 12px 0 28px;
        }

        .bbri-hero-lede {
          font-family: var(--font-body);
          font-weight: 300;
          font-size: clamp(1rem, 1.6vw, 1.2rem);
          line-height: 1.65;
          max-width: 620px;
          color: rgba(240, 235, 227, 0.9);
          margin-bottom: 36px;
        }

        /* ===== BUTTONS ===== */
        .bbri-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 40px;
        }

        .bbri-cta-row-center {
          justify-content: center;
        }

        .bbri-btn {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 16px 28px;
          border-radius: 2px;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
          border: 2px solid transparent;
          cursor: pointer;
        }

        .bbri-btn-primary {
          background: var(--burnt-orange);
          color: var(--cream);
          box-shadow: 0 4px 16px rgba(212, 93, 0, 0.35);
        }
        .bbri-btn-primary:hover {
          background: #b84f00;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(212, 93, 0, 0.45);
        }

        .bbri-btn-ghost {
          background: transparent;
          color: var(--cream);
          border-color: rgba(240, 235, 227, 0.4);
        }
        .bbri-btn-ghost:hover {
          border-color: var(--gold-foil);
          color: var(--gold-foil);
        }

        .bbri-btn-ghost-light {
          background: transparent;
          color: var(--cream);
          border-color: rgba(240, 235, 227, 0.5);
        }
        .bbri-btn-ghost-light:hover {
          background: rgba(240, 235, 227, 0.1);
        }

        /* ===== HERO META ===== */
        .bbri-hero-meta {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 24px;
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: rgba(240, 235, 227, 0.8);
          letter-spacing: 0.04em;
        }

        .bbri-hero-meta li {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bbri-meta-dot {
          width: 5px;
          height: 5px;
          background: var(--gold-foil);
          border-radius: 50%;
          display: inline-block;
        }

        /* ===== SECTIONS ===== */
        .bbri-section {
          padding: 96px 24px;
        }

        .bbri-section-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .bbri-section-light {
          background: var(--cream);
          color: var(--charcoal);
        }

        .bbri-section-cream {
          background: var(--cream-warm);
          color: var(--charcoal);
          text-align: center;
        }

        .bbri-section-dark {
          background: var(--charcoal);
          color: var(--cream);
        }

        .bbri-section-cta {
          background: linear-gradient(135deg, #0F2238 0%, #1F3A5C 50%, #2E4A6B 100%);
          color: var(--cream);
          text-align: center;
        }

        .bbri-section-eyebrow {
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--burnt-orange);
          display: block;
          margin-bottom: 20px;
          position: relative;
          padding-left: 36px;
        }

        .bbri-section-eyebrow::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 24px;
          height: 1px;
          background: var(--burnt-orange);
        }

        .bbri-eyebrow-gold {
          color: var(--gold-foil);
        }
        .bbri-eyebrow-gold::before {
          background: var(--gold-foil);
        }

        .bbri-section-cream .bbri-section-eyebrow,
        .bbri-section-cta .bbri-section-eyebrow {
          padding-left: 0;
        }
        .bbri-section-cream .bbri-section-eyebrow::before,
        .bbri-section-cta .bbri-section-eyebrow::before {
          display: none;
        }

        .bbri-section-title {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: clamp(1.75rem, 4.5vw, 2.75rem);
          line-height: 1.15;
          margin: 0 0 24px;
          color: var(--charcoal);
          letter-spacing: -0.01em;
        }

        .bbri-section-title em {
          font-family: var(--font-script);
          font-style: italic;
          font-weight: 500;
          color: var(--burnt-orange);
        }

        .bbri-section-title-light {
          color: var(--cream);
        }

        .bbri-section-title-light em {
          color: var(--gold-foil);
        }

        .bbri-prose {
          font-family: var(--font-body);
          font-weight: 400;
          font-size: clamp(1rem, 1.4vw, 1.1rem);
          line-height: 1.75;
          max-width: 680px;
        }

        .bbri-section-cream .bbri-prose {
          margin-left: auto;
          margin-right: auto;
        }

        .bbri-prose-light {
          color: rgba(240, 235, 227, 0.85);
        }

        .bbri-prose strong {
          color: var(--charcoal);
          font-weight: 700;
        }
        .bbri-prose-light strong {
          color: var(--cream);
        }

        .bbri-prose em {
          font-family: var(--font-script);
          font-style: italic;
          font-weight: 500;
        }

        /* ===== PILLARS ===== */
        .bbri-pillars {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 32px;
          margin-top: 56px;
          padding-top: 48px;
          border-top: 1px solid rgba(15, 27, 42, 0.12);
        }

        .bbri-pillar h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.1rem;
          margin: 12px 0 8px;
          color: var(--charcoal);
          letter-spacing: 0.02em;
        }

        .bbri-pillar p {
          font-size: 0.95rem;
          color: rgba(15, 27, 42, 0.75);
          line-height: 1.6;
        }

        .bbri-pillar-mark {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 0.85rem;
          color: var(--burnt-orange);
          letter-spacing: 0.15em;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--burnt-orange);
          display: inline-block;
        }

        /* ===== FEATURES (dark section) ===== */
        .bbri-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 32px;
          margin-top: 56px;
        }

        .bbri-feature {
          padding: 32px 24px;
          background: rgba(240, 235, 227, 0.04);
          border: 1px solid rgba(201, 176, 104, 0.2);
          border-radius: 4px;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .bbri-feature:hover {
          border-color: var(--gold-foil);
          transform: translateY(-2px);
        }

        .bbri-feature-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold-foil);
          margin-bottom: 16px;
          border: 1px solid var(--gold-foil);
          border-radius: 2px;
        }

        .bbri-feature h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.15rem;
          margin: 0 0 8px;
          color: var(--cream);
          letter-spacing: 0.02em;
        }

        .bbri-feature p {
          font-size: 0.95rem;
          color: rgba(240, 235, 227, 0.7);
          line-height: 1.6;
        }

        /* ===== HOSTS ===== */
        .bbri-hosts {
          text-align: center;
        }
        .bbri-hosts .bbri-section-title {
          font-size: clamp(2rem, 5vw, 3rem);
        }

        /* ===== CTA BLOCK ===== */
        .bbri-cta-block {
          text-align: center;
        }
        .bbri-cta-block .bbri-prose {
          margin: 0 auto 32px;
        }

        /* ===== DISCLAIMER ===== */
        .bbri-disclaimer {
          background: var(--charcoal);
          color: rgba(240, 235, 227, 0.55);
          padding: 32px 24px;
          font-size: 0.78rem;
          line-height: 1.65;
          border-top: 1px solid rgba(201, 176, 104, 0.15);
        }
        .bbri-disclaimer .bbri-section-inner {
          max-width: 880px;
        }
        .bbri-disclaimer strong {
          color: var(--gold-foil);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 640px) {
          .bbri-hero {
            min-height: 88vh;
            padding: 64px 20px 48px;
          }
          .bbri-section {
            padding: 64px 20px;
          }
          .bbri-hero-inner,
          .bbri-section-inner {
            padding: 0;
          }
          .bbri-hero-meta {
            flex-direction: column;
            gap: 10px;
          }
          .bbri-cta-row {
            flex-direction: column;
            align-items: stretch;
          }
          .bbri-btn {
            text-align: center;
            padding: 14px 24px;
          }
          .bbri-pillars,
          .bbri-features {
            margin-top: 40px;
            gap: 24px;
          }
          .bbri-feature {
            padding: 24px 20px;
          }
          .bbri-disclaimer {
            padding: 24px 20px;
          }
        }

        @media (max-width: 380px) {
          .bbri-hero-title-main {
            letter-spacing: 0.02em;
          }
          .bbri-section-eyebrow {
            padding-left: 0;
          }
          .bbri-section-eyebrow::before {
            display: none;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .bbri-btn,
          .bbri-feature {
            transition: none;
          }
        }
      `}</style>
    </>
  )
}
