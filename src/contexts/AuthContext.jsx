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

    // Step 1: Resolve internal email from username via secure RPC
    // This SECURITY DEFINER function bypasses RLS so it works pre-authentication
    const { data: userEmail, error: emailError } = await supabase
      .rpc('get_email_by_username', { p_username: username.trim() })

    // Generic error — never reveal whether username exists or not
    if (emailError || !userEmail) {
      throw new Error('Invalid username or password.')
    }

    // Step 2: Sign in with resolved email and password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    })

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
