# CLAUDE.md

## What This Project Is
Member portal for the Based in Billings real estate investor meetup group. Members list properties for sale, post buy boxes (what they want to buy), and browse other members' listings. Three roles: visitor (browse only), member (post + browse), admin (manage everything).

## Tech Stack
- Frontend: React 19 (Vite 8 bundler)
- Data fetching: React Query (@tanstack/react-query)
- API routes: `api/` folder (Vercel serverless functions)
- Hosting: Vercel, auto-deploys from GitHub on push to main
- Auth & Database: Supabase (auth, PostgreSQL database, image storage)
- Routing: react-router-dom with persistent Layout shell
- Build command: `npm run build`
- Dev server: `npm run dev`
- Live URL: https://reinvestors.aiwithtiffany.com

## External Services
- `VITE_SUPABASE_URL` — Supabase project URL (used in frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key (used in frontend)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (used in API routes only, NEVER in frontend)

## User Roles
- **Visitor:** Can browse For Sale and Buy Box pages. Cannot post listings or buy boxes. Becomes a member when admin verifies attendance (2 of last 4 meetups) and profile completeness.
- **Member:** Full access. Can post properties for sale, add 1-4 buy boxes, edit/delete own content.
- **Admin:** All member permissions + approve/deny users, toggle visitor↔member, flag/unflag listings, manage all content.

## License Rules
- **Unlicensed members:** Can ONLY list their OWN properties (seller type = "selling own property")
- **Licensed Agent/Broker:** Can list own properties AND add listings as agents. Must provide brokerage name.

## Key Files
- `src/App.jsx` — routing, Layout shell, auth providers
- `src/context/AuthContext.jsx` — Supabase auth state, profile fetch
- `src/components/Navbar.jsx` — top navigation bar
- `src/components/ProtectedRoute.jsx` — role-based route protection
- `src/lib/supabase.js` — Supabase client initialization
- `src/pages/Home.jsx` — public landing page
- `src/pages/Login.jsx` — login/signup/forgot password
- `src/pages/Sellers.jsx` — post/manage own property listings
- `src/pages/AdminDashboard.jsx` — admin user/listing management
- `api/admin-users.js` — admin user management (uses service role key)
- `api/admin-properties.js` — admin listing management (uses service role key)

## Supabase Tables
- `profiles` — user profiles (name, email, phone, location, license info, role, approval)
- `properties` — property listings (address, price, type, condition, financing, status)
- `property_units` — per-unit details for multi-family properties
- `property_images` — image references linked to properties
- `buy_boxes` — buyer criteria (areas, types, price range, expected returns)

## Storage Buckets
- `property-images` — property photos (public, 5MB limit, jpeg/png/webp)
- `avatars` — user profile photos

## Environment Variables
Set in Vercel dashboard (Settings → Environment Variables → all environments):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploy
```
git add -A && git commit -m "describe change" && git push
```

## Things That Break Easily
- **RLS infinite recursion:** NEVER create RLS policies on `profiles` that query `profiles` to check admin role. Admin reads all profiles through serverless API routes (service role key bypasses RLS).
- **Auth token lock conflicts:** Use ONLY `onAuthStateChange` for auth state. NEVER combine with separate `getSession()` calls — they compete for the same auth token lock.
- **Supabase client config:** Must include `persistSession: true` and `autoRefreshToken: true`.
- **Profile query on login:** Query profiles table directly, not via RPC. Only redirect to pending if profile was successfully fetched AND `approved === false`. Show retry/loading state on errors.
- **Service role key:** NEVER in frontend code. Only in `api/` serverless functions.
- **Image uploads:** Must go through Supabase Storage, not base64 in database.
- **FHA compliance:** Screen property descriptions for Fair Housing Act violations.
- **License enforcement:** Block unlicensed members from "listing agent" seller type — enforce in UI and database.
- **CHECK constraints:** Form dropdown values must exactly match database CHECK constraint values (case-sensitive).
- **Missing imports after refactors:** When removing UI elements, verify their imports aren't still used elsewhere.
- **vercel.json required:** Without the rewrite rule, page refreshes on non-root routes return 404.

## Recent Changes
- 2026-04-14: Project created, full auth system, sellers/buyers/admin pages, navbar
- 2026-04-14: Fixed auth lock conflicts, RLS recursion, profile query issues
- 2026-04-14: Ready for Phase 1 (React Query, Layout Shell, schema updates, buy boxes)
