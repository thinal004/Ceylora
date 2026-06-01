const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body)
    const { email, fullName, phone, nic, role, address, emergencyContactName, emergencyContactPhone } = body

    if (!email || !fullName || !role) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email, full name and role are required.' }) }
    }

    // Caller's auth token — verify they are allowed to create this role
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    const callerToken = authHeader.replace('Bearer ', '')

    // Create admin client (service role — never exposed to frontend)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller token
    const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerErr || !callerUser) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid caller token' }) }
    }

    // Get caller profile
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', callerUser.id)
      .single()

    if (!callerProfile || !callerProfile.is_active) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account is inactive' }) }
    }

    // Permission check
    if (role === 'landlord' && callerProfile.role !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only Super Admin can create landlords' }) }
    }
    if (role === 'tenant' && !['super_admin', 'landlord'].includes(callerProfile.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only Landlords can create tenants' }) }
    }

    // Create the new user via admin API
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        phone: phone || null,
        nic: nic || null,
        address: address || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
      }
    })

    if (createErr) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: createErr.message }) }
    }

    // Send password reset email so user can set their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, userId: newUser.user.id, message: `${role} account created. Password setup email sent to ${email}.` })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
