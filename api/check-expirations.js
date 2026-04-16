import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Based in Billings <onboarding@resend.dev>'
const APP_URL = process.env.APP_URL || 'https://reinvestors.aiwithtiffany.com'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendExpirationEmail(to, firstName, address) {
  if (!RESEND_API_KEY || !to) return { skipped: true }
  const html = `
    <p>Hi ${escapeHtml(firstName || 'there')},</p>
    <p>Your listing at <strong>${escapeHtml(address)}</strong> has expired and is no longer showing on the For Sale page.</p>
    <p>You can renew it from your profile — just open the listing and click Renew to pick a new expiration date.</p>
    <p>
      <a href="${APP_URL}/profile" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Go to Profile</a>
    </p>
    <p style="color:#6b7280;font-size:0.9rem">Listings must be renewed within 30 days of expiration.</p>
  `
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Your listing at ${address} has expired`,
      html,
    }),
  })
}

export default async function handler(req, res) {
  // Protect via CRON_SECRET header (Vercel Cron sends this automatically)
  // or via a manual admin call with auth token.
  const cronSecret = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '')
  const authHeader = req.headers.authorization
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET
  let isAdmin = false
  if (!isCron && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      isAdmin = callerProfile?.role === 'admin'
    }
  }
  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'Not authorized' })
  }

  const nowIso = new Date().toISOString()

  // Find properties that should be expired
  const { data: expiring, error: fetchErr } = await supabase
    .from('properties')
    .select('id, address, profile_id, profiles(first_name, email)')
    .eq('status', 'active')
    .lt('expires_at', nowIso)

  if (fetchErr) return res.status(500).json({ error: fetchErr.message })

  const results = []
  for (const p of expiring || []) {
    // Flip status
    const { error: updErr } = await supabase
      .from('properties')
      .update({ status: 'expired' })
      .eq('id', p.id)
    if (updErr) {
      results.push({ id: p.id, ok: false, reason: updErr.message })
      continue
    }

    // Create notification
    if (p.profile_id) {
      await supabase.from('notifications').insert({
        profile_id: p.profile_id,
        title: 'Listing expired',
        message: `Your listing at ${p.address} has expired. You can renew it from your profile.`,
        link: '/profile',
      })
    }

    // Send email (best-effort)
    try {
      await sendExpirationEmail(p.profiles?.email, p.profiles?.first_name, p.address)
    } catch (e) {
      console.error('expiration email failed:', e.message)
    }

    results.push({ id: p.id, ok: true })
  }

  return res.status(200).json({
    checked_at: nowIso,
    expired_count: results.filter((r) => r.ok).length,
    total_found: (expiring || []).length,
    results,
  })
}
