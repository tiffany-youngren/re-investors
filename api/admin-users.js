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

async function sendApprovalEmail(toEmail, firstName) {
  if (!RESEND_API_KEY || !toEmail) return { skipped: true }
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,'
  const html = `
    <p>${greeting}</p>
    <p>Your account has been approved! You can now log in and access the Based in Billings RE Investors portal.</p>
    <p>
      <a href="${APP_URL}/login"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">
        Log In
      </a>
    </p>
    <p style="color:#6b7280;font-size:0.9rem">
      Or visit: <a href="${APP_URL}/login">${APP_URL}/login</a>
    </p>
  `
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: 'Your Based in Billings account has been approved',
      html,
    }),
  })
}

export default async function handler(req, res) {
  // Verify the caller is an admin by checking their auth token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check admin role
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // GET — return all profiles
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST — update a user's role or approval status
  if (req.method === 'POST') {
    const { profileId, approved, role } = req.body
    if (!profileId) return res.status(400).json({ error: 'profileId required' })

    // Snapshot the user's current state so we can detect a pending → approved transition
    const { data: existing } = await supabase
      .from('profiles')
      .select('approved, email, first_name')
      .eq('id', profileId)
      .single()

    const updates = {}
    if (typeof approved === 'boolean') updates.approved = approved
    if (role) updates.role = role

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)

    if (error) return res.status(500).json({ error: error.message })

    // If we just approved a previously-unapproved user, send them an email.
    const becameApproved = existing && !existing.approved && updates.approved === true
    if (becameApproved && existing.email) {
      try {
        const r = await sendApprovalEmail(existing.email, existing.first_name)
        if (r && r.ok === false) {
          const errText = await r.text().catch(() => 'unknown')
          console.error('approval email failed:', errText)
        }
      } catch (e) {
        console.error('approval email error:', e?.message)
      }

      // Notification in-app
      await supabase.from('notifications').insert({
        profile_id: profileId,
        title: 'Account approved',
        message: 'Your account has been approved. Welcome to the Based in Billings RE Investors portal!',
        link: '/profile',
      })
    }

    return res.status(200).json({ success: true, emailed: becameApproved })
  }

  // DELETE — remove a user entirely (auth + profile cascade)
  if (req.method === 'DELETE') {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) return res.status(500).json({ error: error.message })

    // Also delete profile in case cascade isn't set up
    await supabase.from('profiles').delete().eq('user_id', userId)

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
