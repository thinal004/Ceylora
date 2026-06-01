const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const body = JSON.parse(event.body)
    const { username, password, fullName, phone, email, nic, role, address, emergencyContactName, emergencyContactPhone, landlordId } = body

    if (!username || !password || !fullName || !role) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username, password, full name and role are required.' }) }
    }

    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    const callerToken = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller
    const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerErr || !callerUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid caller token' }) }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, id')
      .eq('id', callerUser.id)
      .single()

    if (!callerProfile?.is_active) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account is inactive' }) }
    if (role === 'landlord' && callerProfile.role !== 'super_admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only Super Admin can create landlords' }) }
    if (role === 'tenant' && !['super_admin', 'landlord'].includes(callerProfile.role)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only Landlords can create tenants' }) }

    // Check username uniqueness within landlord scope
    const ownerLandlordId = role === 'tenant' ? (landlordId || callerProfile.id) : null
    if (role === 'tenant') {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .eq('landlord_id', ownerLandlordId)
        .single()
      if (existing) return { statusCode: 400, headers, body: JSON.stringify({ error: `Username "${username}" is already taken. Choose a different one.` }) }
    }
    if (role === 'landlord') {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .eq('role', 'landlord')
        .single()
      if (existing) return { statusCode: 400, headers, body: JSON.stringify({ error: `Username "${username}" is already taken.` }) }
    }

    // Generate internal email from username
    const internalEmail = email || `${username}.${Date.now()}@ceylora.internal`

    // Create user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        username,
        phone: phone || null,
        email: email || null,
        nic: nic || null,
        address: address || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        landlord_id: ownerLandlordId || null,
        must_change_password: true,
      }
    })

    if (createErr) return { statusCode: 400, headers, body: JSON.stringify({ error: createErr.message }) }

    // Update profile with extra fields the trigger may not set
    await supabaseAdmin.from('profiles').update({
      username,
      landlord_id: ownerLandlordId,
      email: email || null,
      must_change_password: true,
    }).eq('id', newUser.user.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, userId: newUser.user.id, message: `Account created. Username: ${username}` })
    }

  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message || 'Internal server error' }) }
  }
}
