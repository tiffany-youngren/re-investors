import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Verify the caller is an admin
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // GET — return all buy boxes with buyer info
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('buy_boxes')
      .select('*, profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST — update a buy box (approval / flag / member response)
  if (req.method === 'POST') {
    const { buyBoxId, approved, flagged, flagReason, flagResponse } = req.body
    if (!buyBoxId) return res.status(400).json({ error: 'buyBoxId required' })

    // Snapshot existing so we can detect flag → unflag transition
    const { data: prevRow } = await supabase
      .from('buy_boxes')
      .select('id, approved, flag_reason')
      .eq('id', buyBoxId)
      .single()
    const wasFlagged = !!prevRow?.flag_reason

    const updates = {}
    if (typeof approved === 'boolean') {
      updates.approved = approved
      // Approving clears any prior flag (reason AND member response)
      if (approved === true) {
        updates.flag_reason = null
        updates.flag_response = null
      }
    }
    if (flagged === true) {
      updates.approved = false
      if (flagReason) updates.flag_reason = String(flagReason).slice(0, 1000)
    }
    if (typeof flagResponse === 'string') {
      updates.flag_response = flagResponse.slice(0, 1000)
    }

    async function tryUpdate(payload) {
      return await supabase
        .from('buy_boxes')
        .update(payload)
        .eq('id', buyBoxId)
        .select('id, profile_id, approved, flag_reason')
        .single()
    }

    let { data: updated, error } = await tryUpdate(updates)
    if (error) {
      const msg = String(error.message || '').toLowerCase()
      if (msg.includes('flag_reason') || msg.includes('flag_response')) {
        const fallback = { ...updates }
        delete fallback.flag_reason
        delete fallback.flag_response
        const retry = await tryUpdate(fallback)
        updated = retry.data
        error = retry.error
      }
    }
    if (error) return res.status(500).json({ error: error.message })

    // Notify the owner on each transition
    if (updated?.profile_id) {
      let title = null, message = null
      if (flagged === true) {
        title = 'Your buy box has been flagged'
        message = `Your buy box was flagged by admin.${flagReason ? ' Reason: ' + flagReason : ''}`
      } else if (approved === true && wasFlagged) {
        title = 'Buy box flag removed'
        message = 'Your buy box is back on the Buy Boxes page.'
      } else if (approved === true && !wasFlagged) {
        title = 'Buy box approved'
        message = 'Your buy box was approved and is now visible on the Buy Boxes page.'
      }
      if (title) {
        console.log('[admin-buyboxes] inserting notification:', { profile_id: updated.profile_id, title })
        const { error: notifErr } = await supabase.from('notifications').insert({
          profile_id: updated.profile_id,
          title,
          message,
          link: '/profile',
        })
        if (notifErr) console.error('[admin-buyboxes] notification insert failed:', notifErr.message)
        else console.log('[admin-buyboxes] notification inserted OK')
      }
    }

    return res.status(200).json({ success: true })
  }

  // DELETE — remove a buy box
  if (req.method === 'DELETE') {
    const { buyBoxId } = req.body
    if (!buyBoxId) return res.status(400).json({ error: 'buyBoxId required' })

    const { error } = await supabase.from('buy_boxes').delete().eq('id', buyBoxId)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
