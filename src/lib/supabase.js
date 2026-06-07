import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check Netlify environment settings.')
}

// ── Master client (Ceylora's own Supabase) ───────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})

// ── Dynamic per-landlord client cache ────────────────────────
const _clientCache = {}

/**
 * Returns a Supabase client pointed at the landlord's own database server.
 * Falls back to the master client if no custom connection is configured.
 *
 * @param {string} landlordId - UUID of the landlord profile
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export async function getDbForLandlord(landlordId) {
  if (!landlordId) return supabase

  // Return cached client if already created this session
  if (_clientCache[landlordId]) return _clientCache[landlordId]

  // Look up custom connection record in master DB
  const { data, error } = await supabase
    .from('tenant_connections')
    .select('db_url, db_anon_key, is_active')
    .eq('landlord_id', landlordId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return supabase  // no custom connection → use master

  const client = createClient(data.db_url, data.db_anon_key, {
    auth: { persistSession: false }   // tenant DB has no Ceylora auth users
  })
  _clientCache[landlordId] = client
  return client
}

/** Clear cached client for a landlord (call after updating connection settings) */
export function evictDbCache(landlordId) {
  delete _clientCache[landlordId]
}

// ── Tenant auth lives on the LANDLORD DB ─────────────────────
// Tenants log in with a Landlord Code → resolve their landlord's Supabase,
// then authenticate there. We remember the code so reloads find the right DB.
const TENANT_CODE_KEY = 'ceylora_tenant_code'
const _codeClientCache = {}

export function getStoredTenantCode() {
  try { return localStorage.getItem(TENANT_CODE_KEY) } catch { return null }
}
export function setStoredTenantCode(code) {
  try { code ? localStorage.setItem(TENANT_CODE_KEY, code) : localStorage.removeItem(TENANT_CODE_KEY) } catch {}
}

/**
 * Build a session-persisting client for a landlord DB, identified by landlord_code.
 * Used as BOTH the auth client and the data client for tenants.
 * Returns null if the code doesn't match an active connection.
 */
export async function getTenantClientByCode(code) {
  const c = (code || '').trim().toUpperCase()
  if (!c) return null
  if (_codeClientCache[c]) return _codeClientCache[c]

  // Pre-auth lookup via SECURITY DEFINER RPC on master
  const { data, error } = await supabase.rpc('get_connection_by_code', { p_code: c })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row || !row.db_url) return null

  const client = createClient(row.db_url, row.db_anon_key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: `ceylora-tenant-${c}` }
  })
  _codeClientCache[c] = client
  return client
}

/**
 * Create a tenant account ON THE LANDLORD DB using the anon key (signUp + profile insert).
 * No service-role key required. The landlord's Supabase must allow signups
 * (email confirmations OFF).
 *
 * @param {object} landlordDb - the landlord DB client (from useAuth().db)
 * @param {string} landlordId - the landlord's UUID (stored on tenant profile for routing)
 */
export async function createTenantOnLandlordDb(landlordDb, landlordId, fields) {
  const { username, password, fullName, email, phone, nic, address, emergencyContactName, emergencyContactPhone, photo } = fields

  // Internal email — username is the real login handle
  const internalEmail = email?.trim() || `${username.trim().toLowerCase()}.${Date.now()}@ceylora.internal`

  // 1. Create the auth user on the landlord DB. The data client is built with
  //    persistSession:false, so this signUp never clobbers the landlord's
  //    master session.
  const { data: signUpData, error: signUpErr } = await landlordDb.auth.signUp({
    email: internalEmail,
    password,
  })
  if (signUpErr) throw new Error(signUpErr.message)
  const userId = signUpData?.user?.id
  if (!userId) throw new Error('Could not create tenant login. Check that signups are enabled on the landlord database.')

  // 2. Insert the tenant profile row on the landlord DB
  const { error: profErr } = await landlordDb.from('profiles').insert({
    id: userId,
    role: 'tenant',
    landlord_id: landlordId,
    username: username.trim(),
    email: email?.trim() || null,
    full_name: fullName,
    phone: phone || null,
    nic: nic || null,
    address: address || null,
    emergency_contact_name: emergencyContactName || null,
    emergency_contact_phone: emergencyContactPhone || null,
    photo: photo || null,
    is_active: true,
    must_change_password: true,
  })
  if (profErr) throw new Error(profErr.message)

  // signUp leaves the new tenant's session in memory on this client.
  // Reset it so the landlord's data client keeps acting as anon.
  try { await landlordDb.auth.signOut() } catch {}

  return { userId }
}

// ── User Creation via Netlify Function ──────────────────────
export async function createUser({ username, password, email, fullName, phone, nic, role, address, emergencyContactName, emergencyContactPhone, landlordId }) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/.netlify/functions/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username, password, email, fullName, phone, nic, role, address, emergencyContactName, emergencyContactPhone, landlordId })
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create user')
  return json
}

// ── Receipt Storage Helpers ──────────────────────────────────
export async function uploadReceipt(file, tenancyId, periodYear, periodMonth) {
  const ext = file.name.split('.').pop()
  const path = `${tenancyId}/${periodYear}-${String(periodMonth).padStart(2, '0')}.${ext}`
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: true })
  if (error) throw error
  return { path: data.path }
}

export async function getSignedReceiptUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

// ── Audit Logging ────────────────────────────────────────────
export async function logAction(userId, action, entity = null, entityId = null, details = null, tenantId = null) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      tenant_id: tenantId,
      action,
      entity,
      entity_id: entityId,
      details,
    })
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────
export const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
