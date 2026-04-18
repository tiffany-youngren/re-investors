import { createClient } from '@supabase/supabase-js'

// Service-role client for the actual writes + cross-table notifications.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Member-side endpoint:
//   POST { kind: 'property' | 'buy_box', id, response }
// Verifies the caller owns the row, saves the response, and notifies all admins.
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

  const { kind, id, response } = req.body || {}
  if (!['property', 'buy_box'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be property or buy_box' })
  }
  if (!id) return res.status(400).json({ error: 'id required' })
  if (typeof response !== 'string' || !response.trim()) {
    return res.status(400).json({ error: 'response is required' })
  }

  // Find caller's profile id
  const { data: caller } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single()
  if (!caller) return res.status(403).json({ error: 'Profile not found' })

  const table = kind === 'property' ? 'properties' : 'buy_boxes'

  // Verify ownership and pull a useful label for the notification
  const labelCol = kind === 'property' ? 'address' : 'id'
  const { data: row, error: rowErr } = await supabase
    .from(table)
    .select(`id, profile_id, ${labelCol}`)
    .eq('id', id)
    .single()
  if (rowErr || !row) return res.status(404).json({ error: 'Item not found' })
  if (row.profile_id !== caller.id) {
    return res.status(403).json({ error: 'Not your item' })
  }

  const trimmed = response.trim().slice(0, 1000)
  const { error: updErr } = await supabase
    .from(table)
    .update({ flag_response: trimmed })
    .eq('id', id)
  if (updErr) return res.status(500).json({ error: updErr.message })

  // Notify every admin
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  const memberName = [caller.first_name, caller.last_name].filter(Boolean).join(' ') || 'A member'
  const itemLabel = kind === 'property' ? `the listing at ${row.address}` : 'a buy box'
  const link = '/admin'

  console.log('[request-flag-review] notifying admins:', admins?.length || 0)
  if (admins && admins.length > 0) {
    const rows = admins.map((a) => ({
      profile_id: a.id,
      title: 'Flag review requested',
      message: `${memberName} requested review of ${itemLabel}.`,
      link,
    }))
    const { error: notifErr } = await supabase.from('notifications').insert(rows)
    if (notifErr) console.error('[request-flag-review] admin notify failed:', notifErr.message)
    else console.log('[request-flag-review] admin notifications inserted OK')
  }

  return res.status(200).json({ success: true })
}
