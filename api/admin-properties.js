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

  // GET — return all properties with seller info
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('properties')
      .select('*, profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST — update a property (e.g. approval status)
  if (req.method === 'POST') {
    const { propertyId, approved, flagged, flagReason } = req.body
    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })

    // Snapshot existing so we can detect a flag → unflag transition
    const { data: prevRow } = await supabase
      .from('properties')
      .select('id, status, flag_reason, approved')
      .eq('id', propertyId)
      .single()
    const wasFlagged = prevRow?.status === 'flagged' || !!prevRow?.flag_reason

    const updates = {}
    if (typeof approved === 'boolean') {
      updates.approved = approved
      // When approving, also activate so it appears on the For Sale page
      if (approved === true) updates.status = 'active'
    }
    if (flagged === true) {
      updates.status = 'flagged'
      if (flagReason) updates.flag_reason = String(flagReason).slice(0, 1000)
    }
    // When unflagging (admin re-approves), clear the reason AND the member's response
    if (approved === true) {
      updates.flag_reason = null
      updates.flag_response = null
    }

    async function tryUpdate(payload) {
      return await supabase
        .from('properties')
        .update(payload)
        .eq('id', propertyId)
        .select('id, address, profile_id, status, flag_reason')
        .single()
    }

    let { data: updated, error } = await tryUpdate(updates)
    // Retry without optional columns if they don't exist yet
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

    // Notifications for the owner
    if (updated?.profile_id) {
      let title = null, message = null
      if (flagged === true) {
        title = 'Your property has been flagged'
        message = `Your listing at ${updated.address} was flagged by admin.${flagReason ? ' Reason: ' + flagReason : ''}`
      } else if (approved === true && wasFlagged) {
        title = 'Property flag removed'
        message = `Your listing at ${updated.address} is back on the For Sale page.`
      } else if (approved === true && !wasFlagged) {
        title = 'Listing approved'
        message = `Your listing at ${updated.address} has been approved and is now live on the For Sale page.`
      }
      if (title) {
        console.log('[admin-properties] inserting notification:', { profile_id: updated.profile_id, title })
        const { error: notifErr } = await supabase.from('notifications').insert({
          profile_id: updated.profile_id,
          title,
          message,
          link: '/profile',
        })
        if (notifErr) console.error('[admin-properties] notification insert failed:', notifErr.message)
        else console.log('[admin-properties] notification inserted OK')
      }
    }

    return res.status(200).json({ success: true })
  }

  // DELETE — remove a property and its images
  if (req.method === 'DELETE') {
    const { propertyId } = req.body
    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })

    // Delete images from storage
    const { data: images } = await supabase
      .from('property_images')
      .select('image_url')
      .eq('property_id', propertyId)

    if (images && images.length > 0) {
      const paths = images.map((img) => {
        const url = new URL(img.image_url)
        const parts = url.pathname.split('/property-images/')
        return parts[1] || ''
      }).filter(Boolean)

      if (paths.length > 0) {
        await supabase.storage.from('property-images').remove(paths)
      }
    }

    // Delete image records
    await supabase.from('property_images').delete().eq('property_id', propertyId)

    // Delete the property
    const { error } = await supabase.from('properties').delete().eq('id', propertyId)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
