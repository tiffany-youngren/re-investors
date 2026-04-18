import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'RE Investors <noreply@omhagency.resend.com>'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const {
    toProfileId,
    contactType,    // 'form' or 'text'
    sourceType,     // 'property' or 'buy_box' or null
    sourceId,       // optional
    senderName,     // for form only
    senderEmail,    // for form only
    message,        // for form only
  } = req.body || {}

  if (!toProfileId) return res.status(400).json({ error: 'toProfileId required' })
  if (!['form', 'text'].includes(contactType)) {
    return res.status(400).json({ error: 'Invalid contactType' })
  }

  // Look up the sender's profile (the from)
  const { data: fromProfile, error: fromErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, approved')
    .eq('user_id', user.id)
    .single()
  if (fromErr || !fromProfile) {
    return res.status(403).json({ error: 'Sender profile not found' })
  }
  if (!fromProfile.approved) {
    return res.status(403).json({ error: 'Account not approved' })
  }

  // Look up the recipient
  const { data: toProfile, error: toErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('id', toProfileId)
    .single()
  if (toErr || !toProfile) {
    return res.status(404).json({ error: 'Recipient not found' })
  }

  // Send email if this was a form submission
  if (contactType === 'form') {
    if (!senderName || !senderEmail || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' })
    }
    if (!toProfile.email) {
      return res.status(400).json({ error: 'Recipient has no email on file' })
    }
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured (missing RESEND_API_KEY)' })
    }

    const subject = `New message from ${senderName} via Based in Billings`
    const html = `
      <p>Hi ${escapeHtml(toProfile.first_name || 'there')},</p>
      <p>You have a new message from a fellow Based in Billings investor:</p>
      <hr/>
      <p><strong>From:</strong> ${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      <hr/>
      <p style="color:#6b7280;font-size:0.9rem">
        Reply directly to this email to respond.
      </p>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toProfile.email],
        reply_to: senderEmail,
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      return res.status(502).json({ error: `Email delivery failed: ${errText}` })
    }
  }

  // Log the event
  const eventRow = {
    from_profile_id: fromProfile.id,
    to_profile_id: toProfile.id,
    contact_type: contactType,
    source_type: sourceType || null,
    source_id: sourceId || null,
  }
  const { error: logErr } = await supabase.from('contact_events').insert(eventRow)
  if (logErr) {
    // Don't fail the whole request just because logging failed
    console.error('contact_events insert failed:', logErr.message)
  }

  // Notify the recipient (only for form submissions — text is opt-in by the sender)
  if (contactType === 'form') {
    const senderFull = [fromProfile.first_name, fromProfile.last_name].filter(Boolean).join(' ') || 'A member'
    console.log('[contact-member] inserting notification for:', toProfile.id)
    const { error: notifErr } = await supabase.from('notifications').insert({
      profile_id: toProfile.id,
      title: 'New message',
      message: `${senderFull} sent you a message. Check your email to reply.`,
      link: '/profile',
    })
    if (notifErr) console.error('[contact-member] notification insert failed:', notifErr.message)
    else console.log('[contact-member] notification inserted OK')
  }

  return res.status(200).json({ success: true })
}
