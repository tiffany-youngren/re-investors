import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    const updates = {}
    if (typeof approved === 'boolean') updates.approved = approved
    if (role) updates.role = role

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
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
