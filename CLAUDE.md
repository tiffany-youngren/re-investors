# CLAUDE.md

## What This Project Is
A member portal for a real estate investor meetup group in Billings, Montana. Members can sign up, get approved by an admin, and then list properties for sale or browse properties to buy. Three user roles: visitor (pending approval), member (approved), and admin (manages approvals and site).

## Tech Stack
- Frontend: React 19 (Vite 8 bundler)
- API routes: `api/` folder (Vercel serverless functions)
- Hosting: Vercel, auto-deploys from GitHub on push to main
- Auth & Database: Supabase (auth, PostgreSQL database, image storage)
- Build command: `npm run build`
- Dev server: `npm run dev`

## External Services
- `VITE_SUPABASE_URL` — Supabase project URL (used in frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key (used in frontend)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (used in API routes only, never in frontend)

## User Roles & Approval Flow
- **Visitor:** Signs up but cannot access listings until approved by admin
- **Member:** Approved by admin. Can browse Buyers page and add properties on Sellers page
- **Admin:** Approves/denies visitors and members. Full access to manage users and listings
- All new sign-ups start as "visitor" (pending). Admin must approve before they can access the site.

## Member Profile Requirements
Before a member can add a property, they must have on file:
- Full name
- Email address
- Phone number
- License status: "Licensed in Montana" or "Unlicensed"
- If licensed: brokerage name (required)

## License Rules
- **Unlicensed members** may ONLY list their OWN properties (seller type must be "selling own property")
- **Licensed members** may list their own properties AND add listings for multi-family or fixer properties as agents

## Pages
- **Home / Landing** — public, explains the group, shows disclaimer, sign-up/login links
- **Login / Sign Up** — Supabase auth
- **Pending Approval** — shown to visitors who signed up but aren't approved yet
- **Buyers** — browse all approved property listings (members only)
- **Sellers** — add/edit/manage your own property listings (members only)
- **Admin Dashboard** — approve/deny users, manage all listings (admin only)

## Property Listing Requirements (Sellers Page)
Every property for sale MUST include:
- Address
- Price
- Seller type: "wholesaling," "listing agent," or "selling own property"
- Property type: fixer, multi-family, or commercial (ALL listings must be one of these)
- If multi-family: number of units
- Occupancy status: vacant, rented, or owner-occupied
- Condition: fixer or turn-key
- Financing available (select all that apply): seller financing, cash at closing, sub-to, conventional, FHA, VA, other
- At least 1 image, max 10 images (auto-downsized to web/wide format on upload)
- Description/details: required, max 300 words, must not contain phrases prohibited by FHA
- **Optional:** estimated ARV (after repair value)
- **Optional:** link to virtual tour or listing URL

## Property Type Restrictions
- ALL properties for sale must be: fixers, multi-family, or commercial
- No single-family turn-key residential listings (unless they are fixers)

## Disclaimer (must appear on the site)
"This is a listing service provided exclusively for meetup members. We are not licensed real estate agents and do not provide real estate brokerage services. This platform is a marketing avenue for members only. Realtor members and licensed agents are exclusively responsible for following all MLS, Realtor association, and state licensing rules and regulations."

## FHA Compliance
Property descriptions must be screened for phrases that violate Fair Housing Act guidelines. Block or warn on discriminatory language related to race, color, religion, sex, national origin, familial status, or disability.

## Image Handling
- Stored in Supabase Storage
- Auto-resize on upload to web-optimized wide format (max ~1200px wide)
- Minimum 1 image required, maximum 10 per listing

## Key Files
(Update this list as files are created)
- `src/App.jsx` — main app component, routing
- `src/pages/Home.jsx` — public landing page with disclaimer
- `src/pages/Login.jsx` — login/signup page
- `src/pages/PendingApproval.jsx` — shown to unapproved users
- `src/pages/Buyers.jsx` — browse property listings
- `src/pages/Sellers.jsx` — add/edit/manage own listings
- `src/pages/AdminDashboard.jsx` — admin user/listing management
- `src/components/PropertyForm.jsx` — the property listing form
- `src/components/PropertyCard.jsx` — property display card for Buyers page
- `src/lib/supabase.js` — Supabase client initialization
- `api/approve-user.js` — serverless function for admin approval (uses service role key)

## Environment Variables
Set in Vercel dashboard (Settings → Environment Variables → all environments):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For local dev, also add these to the `.env` file in the project root.

## Supabase Tables (planned)
- `profiles` — user profiles (name, email, phone, license status, brokerage, role, approval status)
- `properties` — property listings (all required fields above, foreign key to profiles)
- `property_images` — image references linked to properties

## Deploy
Auto-deploys from GitHub. After changes:
```
git add -A && git commit -m "describe change" && git push
```

## Things That Break Easily
(Add to this list as gotchas are discovered)
- Supabase anon key is safe for frontend (it respects Row Level Security) but service role key must NEVER be in frontend code
- Image uploads must go through Supabase Storage, not stored as base64 in the database
- FHA word filter must be maintained — update the blocked phrases list if new violations are discovered
- Unlicensed members must be blocked from selecting "listing agent" as seller type — enforce in both UI and database
- Property type must be fixer, multi-family, or commercial — enforce in both UI and database

## Recent Changes
- 2026-04-13: Project created, initial scaffold
