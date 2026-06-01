import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ── Storage helpers ──────────────────────────────────────────
export async function uploadReceipt(file, tenancyId, periodYear, periodMonth) {
  const ext = file.name.split('.').pop()
  const path = `${tenancyId}/${periodYear}-${String(periodMonth).padStart(2, '0')}.${ext}`
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: true })
  if (error) throw error
  return { path: data.path }
}

export function getReceiptUrl(path) {
  if (!path) return null
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  // Use signed URL for private bucket
  return supabase.storage.from('receipts').createSignedUrl(path, 3600)
}

export async function getSignedReceiptUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
