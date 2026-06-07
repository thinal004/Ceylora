import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  supabase, getDbForLandlord,
  getTenantClientByCode, getStoredTenantCode, setStoredTenantCode,
} from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // authClient = the Supabase project we authenticate against.
  //   • super_admin / landlord  → master
  //   • tenant                  → their landlord's DB (resolved via Landlord Code)
  const authClientRef = useRef(supabase)

  // db = the data client for operational tables (properties, units, tenancies, payments).
  const [db, setDb]                 = useState(supabase)
  const [landlordId, setLandlordId] = useState(null)
  const [dbReady, setDbReady]       = useState(false)

  // ── Boot: pick the right auth client, then wire up the session ──
  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      const code = getStoredTenantCode()
      if (code) {
        const tenantClient = await getTenantClientByCode(code)
        if (tenantClient) authClientRef.current = tenantClient
        else setStoredTenantCode(null)   // stale code → fall back to master
      }
      const client = authClientRef.current

      const { data: { session } } = await client.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else setLoading(false)

      const { data: { subscription } } = client.auth.onAuthStateChange((_e, s) => {
        setUser(s?.user ?? null)
        if (s?.user) fetchProfile(s.user.id)
        else { setProfile(null); setLoading(false) }
      })
      unsub = () => subscription.unsubscribe()
    })()
    return () => unsub()
  }, [])

  // ── Resolve the operational db client whenever the profile changes ──
  useEffect(() => {
    let cancelled = false
    if (!profile) { setDb(supabase); setLandlordId(null); setDbReady(false); return }

    // Tenant: profile lives on the landlord DB, which is already the auth client.
    if (profile.role === 'tenant') {
      setLandlordId(profile.landlord_id)
      setDb(authClientRef.current)
      setDbReady(true)
      return
    }

    // Landlord: route to their own DB (if a connection is configured).
    if (profile.role === 'landlord') {
      setLandlordId(profile.id)
      setDbReady(false)
      getDbForLandlord(profile.id).then(client => {
        if (!cancelled) { setDb(client); setDbReady(true) }
      })
      return () => { cancelled = true }
    }

    // Super admin: master only.
    setLandlordId(null)
    setDb(supabase)
    setDbReady(true)
  }, [profile])

  async function fetchProfile(userId) {
    const { data } = await authClientRef.current.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  /**
   * Username login.
   *  - No landlordCode → master login (super_admin / landlord)
   *  - landlordCode    → tenant login against that landlord's DB
   */
  async function signInWithUsername(username, password, landlordCode = '') {
    if (!username || !password) throw new Error('Username and password are required.')

    let client = supabase
    if (landlordCode && landlordCode.trim()) {
      const tenantClient = await getTenantClientByCode(landlordCode)
      if (!tenantClient) throw new Error('Invalid landlord code.')
      client = tenantClient
    }

    // Resolve internal email from username (SECURITY DEFINER RPC, pre-auth)
    const { data: userEmail, error: emailError } = await client
      .rpc('get_email_by_username', { p_username: username.trim() })
    if (emailError || !userEmail) throw new Error('Invalid username or password.')

    const { error: signInError } = await client.auth.signInWithPassword({
      email: userEmail, password,
    })
    if (signInError) throw new Error('Invalid username or password.')

    // Commit the chosen client as the active auth client
    authClientRef.current = client
    setStoredTenantCode(landlordCode && landlordCode.trim() ? landlordCode.trim().toUpperCase() : null)
  }

  async function signOut() {
    await authClientRef.current.auth.signOut()
    setStoredTenantCode(null)
    authClientRef.current = supabase
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function updateProfile(updates) {
    if (!user) return
    const { error } = await authClientRef.current.from('profiles').update(updates).eq('id', user.id)
    if (error) throw error
    await fetchProfile(user.id)
  }

  async function changePassword(newPassword) {
    const { error } = await authClientRef.current.auth.updateUser({ password: newPassword })
    if (error) throw error
    await authClientRef.current.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, db, landlordId, dbReady, signInWithUsername, signOut, refreshProfile, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
