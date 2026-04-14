import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase.rpc('get_user_profile', { p_user_id: userId })

    console.log('RPC raw response:', JSON.stringify({ data, error }))

    if (error) {
      console.error('RPC get_user_profile error:', error.message)
      return null
    }

    // Handle both array and single object responses
    let profileRow = null
    if (Array.isArray(data) && data.length > 0) {
      profileRow = data[0]
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      profileRow = data
    }

    console.log('Parsed profile:', JSON.stringify(profileRow))
    return profileRow
  } catch (err) {
    console.error('Profile fetch failed:', err.message)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    // Use ONLY onAuthStateChange — it fires INITIAL_SESSION on mount,
    // SIGNED_IN on login, and SIGNED_OUT on logout.
    // No separate getSession() call needed — that causes lock contention.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth event:', event)

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          setRoleLoading(true)
          const profileData = await fetchUserProfile(currentSession.user.id)
          setProfile(profileData)
          setRoleLoading(false)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    // Clear state immediately so UI updates right away
    setSession(null)
    setUser(null)
    setProfile(null)
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error.message)
  }

  async function refreshProfile() {
    if (user) {
      setRoleLoading(true)
      const profileData = await fetchUserProfile(user.id)
      setProfile(profileData)
      setRoleLoading(false)
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    roleLoading,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
