import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ])
}

async function fetchUserProfile(userId) {
  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_user_profile', { p_user_id: userId })
    )
    if (error) {
      console.error('RPC get_user_profile error:', error.message)
      return null
    }
    // RPC returns an array; we want the first row
    if (Array.isArray(data) && data.length > 0) {
      return data[0]
    }
    return null
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

  // Load profile for a given user
  async function loadProfile(userId) {
    setRoleLoading(true)
    const profileData = await fetchUserProfile(userId)
    setProfile(profileData)
    setRoleLoading(false)
  }

  useEffect(() => {
    // 1. Get the initial session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id)
      }

      setLoading(false)
    })

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id)
        } else {
          setProfile(null)
        }

        // Ensure loading is false after any auth event
        setLoading(false)
      }
    )

    // 3. Re-fetch profile when the tab regains focus
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s?.user) {
            loadProfile(s.user.id)
          }
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    // onAuthStateChange will handle setting session/user/profile
    return { data, error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    // onAuthStateChange will clear session/user/profile
    if (error) console.error('Error signing out:', error.message)
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id)
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
