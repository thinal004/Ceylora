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
