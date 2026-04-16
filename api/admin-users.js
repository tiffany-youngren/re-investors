import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Based in Billings <onboarding@resend.dev>'
const APP_URL = process.env.APP_URL || 'https://reinvestors.aiwithtiffany.com'
const SUPPORT_EMAIL = 'info@youngrensolutions.com'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function loginButtonHtml() {
  return `
    <p style="margin: 16px 0">
      <a href="${APP_URL}/login"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">
        Log In
      </a>
    </p>
    <p style="color:#6b7280;font-size:0.9rem">
      Or visit: <a href="${APP_URL}/login">${APP_URL}/login</a>
    </p>
  `
}

async function sendStatusEmail(toEmail, firstName, kind) {
  console.log('[admin-users] sendStatusEmail attempt:', {
    kind,
    toEmail,
    hasResendKey: !!RESEND_API_KEY,
    fromEmail: FROM_EMAIL,
  })

  if (!RESEND_API_KEY) {
    console.warn('[admin-users] RESEND_API_KEY not configured — email skipped')
    return { skipped: true, reason: 'no-resend-key' }
  }
  if (!toEmail) {
    console.warn('[admin-users] no recipient email — skipped')
    return { skipped: true, reason: 'no-recipient' }
  }

  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,'
  let subject, body

  switch (kind) {
    case 'approved_member':
      subject = "You've been approved as a Member"
      body = `<p>You've been approved as a Member! You can now post properties and buy boxes.</p>`
      break
    case 'approved_visitor':
      subject = "You've been approved as a Visitor"
      body = `<p>You've been approved as a Visitor! You can browse listings and contact members.</p>`
      break
    case 'downgraded_to_visitor':
      subject = 'Your membership status has been changed to Visitor'
      body = `
        <p>Your membership status has been changed to Visitor.</p>
        <p>A common reason for this change is not attending at least 2 of the last 4 meetups.
        If you have questions, email
        <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `
      break
    case 'revoked':
      subject = 'Your access has been revoked'
      body = `
        <p>Your access has been revoked.</p>
        <p>If you have questions, email
        <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `
      break
    default:
      console.warn('[admin-users] unknown email kind:', kind)
      return { skipped: true, reason: 'unknown-kind' }
  }

  const html = `
    <p>${greeting}</p>
    ${body}
    ${loginButtonHtml()}
  `

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject,
        html,
      }),
    })
    const text = await r.text()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text }
    console.log('[admin-users] Resend response:', { status: r.status, body: parsed })
    if (!r.ok) {
      return { ok: false, status: r.status, body: parsed }
    }
    return { ok: true, body: parsed }
  } catch (e) {
    console.error('[admin-users] Resend fetch threw:', e?.message, e)
    return { ok: false, error: e?.message }
  }
}

// Detect which transition (if any) occurred between previous and new state.
function detectTransition(prev, next) {
  const wasApproved = prev?.approved === true
  const willApproved = next.approved === true
  const prevRole = prev?.role || 'visitor'
  const newRole = next.role || prevRole

  if (!wasApproved && willApproved && newRole === 'member') return 'approved_member'
  if (!wasApproved && willApproved && newRole === 'visitor') return 'approved_visitor'
  if (wasApproved && willApproved && prevRole === 'member' && newRole === 'visitor') return 'downgraded_to_visitor'
  if (wasApproved && !willApproved) return 'revoked'
  // Going straight to declined role from any state counts as revoked
  if (newRole === 'declined' && prevRole !== 'declined') return 'revoked'
  return null
}

async function notifyUser(profileId, title, message, link = '/profile') {
  if (!profileId || !title) return
  const { error } = await supabase.from('notifications').insert({
    profile_id: profileId,
    title,
    message,
    link,
  })
  if (error) console.warn('[admin-users] notification insert failed:', error.message)
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

    // Snapshot the user's current state.
    const { data: existing, error: existErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()
    if (existErr || !existing) {
      return res.status(404).json({ error: existErr?.message || 'User not found' })
    }

    // Build update object with ONLY fields the request explicitly asked to change.
    const updates = {}
    if (typeof approved === 'boolean') updates.approved = approved
    if (role) updates.role = role

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)

    if (updateErr) {
      console.error('[admin-users] update failed:', updateErr.message)
      return res.status(500).json({ error: updateErr.message })
    }

    // Determine transition + send email + notification
    const transition = detectTransition(existing, {
      approved: typeof approved === 'boolean' ? approved : existing.approved,
      role: role || existing.role,
    })

    let emailResult = null
    if (transition && existing.email) {
      emailResult = await sendStatusEmail(existing.email, existing.first_name, transition)
    }

    if (transition) {
      let title = null, message = null
      if (transition === 'approved_member') {
        title = 'Approved as Member'
        message = 'You can now post properties and buy boxes.'
      } else if (transition === 'approved_visitor') {
        title = 'Approved as Visitor'
        message = 'You can browse listings and contact members.'
      } else if (transition === 'downgraded_to_visitor') {
        title = 'Membership changed to Visitor'
        message = `If you have questions, email ${SUPPORT_EMAIL}.`
      } else if (transition === 'revoked') {
        title = 'Access revoked'
        message = `If you have questions, email ${SUPPORT_EMAIL}.`
      }
      if (title) await notifyUser(profileId, title, message, '/profile')
    }

    return res.status(200).json({ success: true, transition, emailResult })
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
