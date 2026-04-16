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

  // POST — update a buy box approval status
  if (req.method === 'POST') {
    const { buyBoxId, approved } = req.body
    if (!buyBoxId) return res.status(400).json({ error: 'buyBoxId required' })

    const updates = {}
    if (typeof approved === 'boolean') updates.approved = approved

    const { error } = await supabase
      .from('buy_boxes')
      .update(updates)
      .eq('id', buyBoxId)

    if (error) return res.status(500).json({ error: error.message })
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
