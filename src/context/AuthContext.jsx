import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, phone, license_status, brokerage_name, role, approved')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Profile query error:', error.message)
      return null
    }

    return data
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
  const fetchInProgress = useRef(false)
  const debounceTimer = useRef(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (!currentSession?.user) {
          setProfile(null)
          setLoading(false)
          return
        }

        // Debounce: if multiple events fire rapidly, only process the last one
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current)
        }

        debounceTimer.current = setTimeout(async () => {
          const userId = currentSession.user.id

          // Skip if a fetch is already running for this user
          if (fetchInProgress.current) return
          fetchInProgress.current = true

          setRoleLoading(true)
          const profileData = await fetchUserProfile(userId)
          setProfile(profileData)
          setRoleLoading(false)
          setLoading(false)

          fetchInProgress.current = false
        }, 100)
      }
    )

    // Safety net: if no auth event fires within 3 seconds, stop loading
    const safetyTimeout = setTimeout(() => {
      setLoading((current) => {
        if (current) return false
        return current
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      clearTimeout(safetyTimeout)
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
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
