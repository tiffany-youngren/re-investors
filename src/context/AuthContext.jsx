import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, phone, phone_country_code, role, approved, license_status, brokerage_name, city, state, investment_areas, avatar_url, attends_meetups')
      .eq('user_id', userId)
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: data, error: null }
  } catch (err) {
    return { profile: null, error: err.message }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const fetchInProgress = useRef(false)
  const debounceTimer = useRef(null)
  const profileRef = useRef(null)
  const userRef = useRef(null)

  // Keep refs in sync with state so the onAuthStateChange callback
  // always sees current values (the effect has [] deps, so without
  // refs the callback captures stale initial values)
  useEffect(() => { profileRef.current = profile }, [profile])
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (!currentSession?.user) {
          setProfile(null)
          setProfileError(null)
          setLoading(false)
          return
        }

        // Skip profile re-fetch on token refresh if we already have a profile
        // for this user. TOKEN_REFRESHED fires when switching browser tabs,
        // and re-fetching causes roleLoading=true which unmounts forms via
        // ProtectedRoute, losing all entered data.
        if (event === 'TOKEN_REFRESHED' && profileRef.current && userRef.current?.id === currentSession.user.id) {
          setLoading(false)
          return
        }

        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current)
        }

        debounceTimer.current = setTimeout(async () => {
          const userId = currentSession.user.id

          if (fetchInProgress.current) return
          fetchInProgress.current = true

          setRoleLoading(true)
          const { profile: profileData, error } = await fetchUserProfile(userId)
          setProfile(profileData)
          setProfileError(error)
          setRoleLoading(false)
          setLoading(false)

          fetchInProgress.current = false
        }, 100)
      }
    )

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
    setProfileError(null)
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error.message)
  }

  async function refreshProfile() {
    if (user) {
      // Don't set roleLoading here — that would cause ProtectedRoute to
      // show a loading screen and unmount the current page
      const { profile: profileData, error } = await fetchUserProfile(user.id)
      setProfile(profileData)
      setProfileError(error)
    }
  }

  const value = {
    user,
    session,
    profile,
    profileError,
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
