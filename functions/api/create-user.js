/**
 * CEYLORA — create-user  (Cloudflare Pages Function)
 * Route: /api/create-user
 *
 * Secure landlord/tenant creation using the Supabase service-role key,
 * which lives only in Cloudflare env (never shipped to the browser).
 *
 * Mirrors the original Netlify function:
 * - Bearer token verification via Supabase Admin
 * - Role-based authorization (super_admin → landlords, landlord → tenants)
 * - Input validation + sanitization
 * - Username uniqueness scoped per landlord
 * - Best-effort in-memory rate limiting
 * - CORS restricted to allowed origins
 */

import { createClient } from '@supabase/supabase-js'

// ── In-memory rate limiting (per isolate; best-effort) ───────
const rateLimitStore = new Map()
const RATE_LIMIT_MAX    = 10
const RATE_LIMIT_WINDOW = 60 * 1000

function isRateLimited(id) {
  const now = Date.now()
  const entry = rateLimitStore.get(id) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW }
  if (now > entry.resetAt) { rateLimitStore.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW }); return false }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++; rateLimitStore.set(id, entry); return false
}

// ── Allowed origins ──────────────────────────────────────────
const STATIC_ORIGINS = [
  'https://ceyloratenantmanager.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
function getAllowedOrigin(origin) {
  if (!origin) return STATIC_ORIGINS[0]
  if (STATIC_ORIGINS.includes(origin)) return origin
  // Any Cloudflare Pages preview/prod domain for this project
  if (/^https:\/\/([a-z0-9-]+\.)?ceylora[a-z0-9-]*\.pages\.dev$/.test(origin)) return origin
  if (/\.pages\.dev$/.test(origin)) return origin
  return STATIC_ORIGINS[0]
}

// ── Helpers ──────────────────────────────────────────────────
const sanitize = v => (!v || typeof v !== 'string') ? '' : v.trim().replace(/<[^>]*>/g, '').slice(0, 255)
const validateUsername = u => /^[a-zA-Z0-9_.-]{3,50}$/.test(u)
const validatePassword = p => typeof p === 'string' && p.length >= 6 && p.length <= 128

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  })
}

// ── CORS preflight ───────────────────────────────────────────
export async function onRequestOptions(context) {
  const origin = getAllowedOrigin(context.request.headers.get('origin'))
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// ── Main handler ─────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context
  const origin = getAllowedOrigin(request.headers.get('origin'))

  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown'
  if (isRateLimited(clientIp)) {
    return json(429, { error: 'Too many requests. Please try again later.' }, origin)
  }

  try {
    let body
    try { body = await request.json() } catch { return json(400, { error: 'Invalid request body.' }, origin) }

    const username   = sanitize(body.username)
    const fullName   = sanitize(body.fullName)
    const phone      = sanitize(body.phone)
    const email      = sanitize(body.email)
    const nic        = sanitize(body.nic)
    const role       = sanitize(body.role)
    const address    = sanitize(body.address)
    const ecName     = sanitize(body.emergencyContactName)
    const ecPhone    = sanitize(body.emergencyContactPhone)
    const landlordId = sanitize(body.landlordId)
    const password   = typeof body.password === 'string' ? body.password : ''

    if (!username || !fullName || !role) return json(400, { error: 'Username, full name and role are required.' }, origin)
    if (!validateUsername(username))     return json(400, { error: 'Username must be 3–50 characters and contain only letters, numbers, underscores, dots, or hyphens.' }, origin)
    if (!validatePassword(password))     return json(400, { error: 'Password must be 6–128 characters.' }, origin)
    if (!['landlord', 'tenant'].includes(role)) return json(400, { error: 'Invalid role.' }, origin)

    const authHeader = request.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Unauthorized.' }, origin)
    const callerToken = authHeader.replace('Bearer ', '').trim()

    const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerErr || !callerUser) return json(401, { error: 'Invalid or expired session.' }, origin)

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles').select('id, role, is_active').eq('id', callerUser.id).single()
    if (profileErr || !callerProfile) return json(403, { error: 'Caller profile not found.' }, origin)
    if (!callerProfile.is_active)      return json(403, { error: 'Your account is suspended.' }, origin)

    if (role === 'landlord' && callerProfile.role !== 'super_admin')
      return json(403, { error: 'Only Super Admin can create landlord accounts.' }, origin)
    if (role === 'tenant' && !['super_admin', 'landlord'].includes(callerProfile.role))
      return json(403, { error: 'Only Landlords can create tenant accounts.' }, origin)

    const ownerLandlordId = role === 'tenant' ? ((landlordId || callerProfile.id) || null) : null

    if (role === 'tenant' && ownerLandlordId) {
      const { data: existing } = await supabaseAdmin
        .from('profiles').select('id').eq('username', username).eq('landlord_id', ownerLandlordId).maybeSingle()
      if (existing) return json(400, { error: `Username "${username}" is already taken within this account.` }, origin)
    }
    if (role === 'landlord') {
      const { data: existing } = await supabaseAdmin
        .from('profiles').select('id').eq('username', username).eq('role', 'landlord').maybeSingle()
      if (existing) return json(400, { error: `Username "${username}" is already taken.` }, origin)
    }

    const internalEmail = (email && email.includes('@') && !email.endsWith('@ceylora.internal'))
      ? email : `${username}.${Date.now()}@ceylora.internal`

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName, role, username,
        phone: phone || null,
        email: (email && email !== internalEmail) ? email : null,
        nic: nic || null, address: address || null,
        emergency_contact_name: ecName || null,
        emergency_contact_phone: ecPhone || null,
        landlord_id: ownerLandlordId || null,
        must_change_password: true,
      },
    })

    if (createErr) {
      if (createErr.message.includes('already been registered'))
        return json(400, { error: 'This email address is already registered.' }, origin)
      return json(400, { error: 'Failed to create account. Please try again.' }, origin)
    }

    await supabaseAdmin.from('profiles').update({
      username,
      landlord_id: ownerLandlordId || null,
      email: (email && email !== internalEmail) ? email : null,
      phone: phone || null, nic: nic || null, address: address || null,
      emergency_contact_name: ecName || null,
      emergency_contact_phone: ecPhone || null,
      must_change_password: true, is_active: true,
    }).eq('id', newUser.user.id)

    return json(200, { success: true, userId: newUser.user.id, message: `Account created successfully. Username: ${username}` }, origin)
  } catch {
    return json(500, { error: 'An unexpected error occurred.' }, origin)
  }
}

// Reject other methods
export async function onRequest(context) {
  if (context.request.method === 'POST')    return onRequestPost(context)
  if (context.request.method === 'OPTIONS') return onRequestOptions(context)
  const origin = getAllowedOrigin(context.request.headers.get('origin'))
  return json(405, { error: 'Method not allowed' }, origin)
}
