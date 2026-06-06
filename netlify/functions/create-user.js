/**
 * CEYLORA — create-user Netlify Function
 * Secure user creation endpoint for landlords and tenants.
 *
 * Security controls:
 * - Bearer token verification via Supabase Admin
 * - Role-based authorization (super_admin creates landlords, landlords create tenants)
 * - Input validation and sanitization
 * - Username uniqueness scoped per landlord
 * - Rate limiting via in-memory store (resets on cold start)
 * - CORS restricted to allowed origins
 * - No sensitive data in error responses
 */

const { createClient } = require('@supabase/supabase-js')

// ── In-memory rate limiting (resets on cold start) ──────────
const rateLimitStore = new Map()
const RATE_LIMIT_MAX      = 10   // max requests
const RATE_LIMIT_WINDOW   = 60 * 1000 // per 60 seconds

function isRateLimited(identifier) {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW }
  if (now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  rateLimitStore.set(identifier, entry)
  return false
}

// ── Allowed origins ──────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://ceyloratenantmanager.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getAllowedOrigin(requestOrigin) {
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]
}

// ── Input sanitization ───────────────────────────────────────
function sanitize(value) {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/<[^>]*>/g, '').slice(0, 255)
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_.-]{3,50}$/.test(username)
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128
}

// ── Standard response helper ─────────────────────────────────
function respond(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
    body: JSON.stringify(body),
  }
}

// ── Main handler ─────────────────────────────────────────────
exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin || ''
  const allowedOrigin = getAllowedOrigin(requestOrigin)

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' }, allowedOrigin)
  }

  // Rate limiting by IP
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return respond(429, { error: 'Too many requests. Please try again later.' }, allowedOrigin)
  }

  try {
    // ── Parse and validate body ──────────────────────────────
    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return respond(400, { error: 'Invalid request body.' }, allowedOrigin)
    }

    const {
      username:              rawUsername,
      password:              rawPassword,
      fullName:              rawFullName,
      phone:                 rawPhone,
      email:                 rawEmail,
      nic:                   rawNic,
      role:                  rawRole,
      address:               rawAddress,
      emergencyContactName:  rawEcName,
      emergencyContactPhone: rawEcPhone,
      landlordId:            rawLandlordId,
    } = body

    // Sanitize inputs
    const username    = sanitize(rawUsername)
    const fullName    = sanitize(rawFullName)
    const phone       = sanitize(rawPhone)
    const email       = sanitize(rawEmail)
    const nic         = sanitize(rawNic)
    const role        = sanitize(rawRole)
    const address     = sanitize(rawAddress)
    const ecName      = sanitize(rawEcName)
    const ecPhone     = sanitize(rawEcPhone)
    const landlordId  = sanitize(rawLandlordId)
    const password    = typeof rawPassword === 'string' ? rawPassword : ''

    // Validate required fields
    if (!username || !fullName || !role) {
      return respond(400, { error: 'Username, full name and role are required.' }, allowedOrigin)
    }
    if (!validateUsername(username)) {
      return respond(400, { error: 'Username must be 3–50 characters and contain only letters, numbers, underscores, dots, or hyphens.' }, allowedOrigin)
    }
    if (!validatePassword(password)) {
      return respond(400, { error: 'Password must be 6–128 characters.' }, allowedOrigin)
    }
    if (!['landlord', 'tenant'].includes(role)) {
      return respond(400, { error: 'Invalid role.' }, allowedOrigin)
    }

    // ── Verify caller authentication ─────────────────────────
    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return respond(401, { error: 'Unauthorized.' }, allowedOrigin)
    }
    const callerToken = authHeader.replace('Bearer ', '').trim()

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller's JWT
    const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerErr || !callerUser) {
      return respond(401, { error: 'Invalid or expired session.' }, allowedOrigin)
    }

    // Fetch caller's profile
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', callerUser.id)
      .single()

    if (profileErr || !callerProfile) {
      return respond(403, { error: 'Caller profile not found.' }, allowedOrigin)
    }
    if (!callerProfile.is_active) {
      return respond(403, { error: 'Your account is suspended.' }, allowedOrigin)
    }

    // ── Role-based authorization ─────────────────────────────
    if (role === 'landlord' && callerProfile.role !== 'super_admin') {
      return respond(403, { error: 'Only Super Admin can create landlord accounts.' }, allowedOrigin)
    }
    if (role === 'tenant' && !['super_admin', 'landlord'].includes(callerProfile.role)) {
      return respond(403, { error: 'Only Landlords can create tenant accounts.' }, allowedOrigin)
    }

    // ── Determine owner landlord ID ──────────────────────────
    const ownerLandlordId = role === 'tenant'
      ? (landlordId || callerProfile.id) || null
      : null

    // ── Username uniqueness check ────────────────────────────
    if (role === 'tenant' && ownerLandlordId) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .eq('landlord_id', ownerLandlordId)
        .maybeSingle()
      if (existing) {
        return respond(400, { error: `Username "${username}" is already taken within this account. Please choose a different one.` }, allowedOrigin)
      }
    }
    if (role === 'landlord') {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .eq('role', 'landlord')
        .maybeSingle()
      if (existing) {
        return respond(400, { error: `Username "${username}" is already taken. Please choose a different one.` }, allowedOrigin)
      }
    }

    // ── Generate internal email ──────────────────────────────
    // Users log in with username; email is internal only
    const internalEmail = (email && email.includes('@') && !email.endsWith('@ceylora.internal'))
      ? email
      : `${username}.${Date.now()}@ceylora.internal`

    // ── Create auth user ─────────────────────────────────────
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name:               fullName,
        role,
        username,
        phone:                   phone || null,
        email:                   (email && email !== internalEmail) ? email : null,
        nic:                     nic || null,
        address:                 address || null,
        emergency_contact_name:  ecName || null,
        emergency_contact_phone: ecPhone || null,
        landlord_id:             ownerLandlordId || null,
        must_change_password:    true,
      },
    })

    if (createErr) {
      // Don't leak internal error details
      console.error('Create user error:', createErr.message)
      if (createErr.message.includes('already been registered')) {
        return respond(400, { error: 'This email address is already registered.' }, allowedOrigin)
      }
      return respond(400, { error: 'Failed to create account. Please try again.' }, allowedOrigin)
    }

    // ── Ensure profile is complete ───────────────────────────
    // The trigger handles initial insert; this ensures all fields are set
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        username,
        landlord_id:          ownerLandlordId || null,
        email:                (email && email !== internalEmail) ? email : null,
        phone:                phone || null,
        nic:                  nic || null,
        address:              address || null,
        emergency_contact_name:  ecName || null,
        emergency_contact_phone: ecPhone || null,
        must_change_password: true,
        is_active:            true,
      })
      .eq('id', newUser.user.id)

    if (updateErr) {
      console.error('Profile update error:', updateErr.message)
    }

    return respond(200, {
      success: true,
      userId: newUser.user.id,
      message: `Account created successfully. Username: ${username}`,
    }, allowedOrigin)

  } catch (err) {
    console.error('Unexpected error:', err.message)
    return respond(500, { error: 'An unexpected error occurred.' }, allowedOrigin)
  }
}
