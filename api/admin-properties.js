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
    const { propertyId, approved, flagged } = req.body
    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })

    const updates = {}
    if (typeof approved === 'boolean') {
      updates.approved = approved
      // When approving, also activate so it appears on the For Sale page
      if (approved === true) updates.status = 'active'
    }
    if (flagged === true) updates.status = 'flagged'

    const { data: updated, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select('id, address, profile_id, status')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Create a notification for the owner
    if (updated?.profile_id) {
      let title = null, message = null
      if (updates.status === 'active') {
        title = 'Listing approved'
        message = `Your listing at ${updated.address} has been approved and is now live on the For Sale page.`
      } else if (updates.status === 'flagged') {
        title = 'Listing flagged'
        message = `Your listing at ${updated.address} was flagged by admin and is no longer visible. Please contact admin.`
      }
      if (title) {
        await supabase.from('notifications').insert({
          profile_id: updated.profile_id,
          title,
          message,
          link: '/profile',
        })
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
