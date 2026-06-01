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

  // Username login — looks up the internal email then signs in
  async function signInWithUsername(username, password) {
    // Look up internal email by username
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (error || !data) throw new Error('Username not found.')

    // Get the auth user's email using the profile id
    const { data: authData, error: authError } = await supabase.rpc('get_user_email', { user_id: data.id })
    if (authError || !authData) {
      // Fallback: try signing in with generated email pattern
      throw new Error('Login failed. Please contact your administrator.')
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authData,
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
