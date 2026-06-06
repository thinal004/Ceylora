import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  // Username login — resolves internal email via secure RPC then signs in
  async function signInWithUsername(username, password) {
    if (!username || !password) throw new Error('Username and password are required.')

    // Step 1: Find the profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()

    // Use a generic error to prevent username enumeration attacks
    if (profileError || !profile) {
      throw new Error('Invalid username or password.')
    }

    // Step 2: Get the internal email via SECURITY DEFINER function
    const { data: userEmail, error: emailError } = await supabase
      .rpc('get_user_email', { p_user_id: profile.id })

    if (emailError || !userEmail) {
      throw new Error('Invalid username or password.')
    }

    // Step 3: Sign in with internal email and password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    })

    // Generic error — never reveal whether username or password was wrong
    if (signInError) throw new Error('Invalid username or password.')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function updateProfile(updates) {
    if (!user) return
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (error) throw error
    await fetchProfile(user.id)
  }

  async function changePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signOut, refreshProfile, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
