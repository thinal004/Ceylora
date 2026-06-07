import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createTenantOnLandlordDb, LKR } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import ImageInput from '../../components/ui/ImageInput'
import { calcOutstanding } from '../../lib/outstanding'

export default function Tenants() {
  const { profile, db } = useAuth()

  const [tenants, setTenants]       = useState([])   // all tenant profiles under this landlord
  const [tenancies, setTenancies]   = useState([])   // active tenancies
  const [vacantUnits, setVacantUnits] = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchErr, setFetchErr]     = useState('')
  const [modal, setModal]           = useState(false) // 'create' | 'edit' | 'assign' | false
  const [editTarget, setEditTarget] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const EMPTY_CREATE = {
    username:'', password:'', full_name:'', email:'', phone:'', nic:'',
    address:'', emergency_contact_name:'', emergency_contact_phone:'', photo:null
  }
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [editForm, setEditForm]     = useState({
    full_name:'', email:'', phone:'', nic:'', address:'',
    emergency_contact_name:'', emergency_contact_phone:'', photo:null
  })
  const [assignForm, setAssignForm] = useState({
    tenant_id:'', unit_id:'', monthly_rent:'',
    start_date: new Date().toISOString().split('T')[0],
    deposit_amount:'', rent_due_day:'1', notes:''
  })

  useEffect(() => { fetchData() }, [db])

  async function fetchData() {
    setFetchErr('')

    // 1. Get all tenants under this landlord — TENANT PROFILES LIVE ON LANDLORD DB
    const { data: tenantProfiles, error: tErr } = await db
      .from('profiles')
      .select('*')
      .eq('role', 'tenant')
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })

    if (tErr) { setFetchErr(tErr.message); setLoading(false); return }

    // 2. Get all properties for this landlord — OPERATIONAL DB
    const { data: props } = await db
      .from('properties')
      .select('id, name')
      .eq('landlord_id', profile.id)

    const pIds = (props || []).map(p => p.id)

    // 3. Get all units
    const { data: units } = pIds.length
      ? await db.from('units').select('id, unit_number, monthly_rent, electricity_charges, water_charges, is_occupied, property_id').in('property_id', pIds)
      : { data: [] }

    // 4. Get active tenancies (units join is within the same operational DB)
    const unitIds = (units || []).map(u => u.id)
    const { data: activeTenancies } = unitIds.length
      ? await db.from('tenancies').select('*, units(unit_number, property_id, electricity_charges, water_charges)').in('unit_id', unitIds).eq('is_active', true)
      : { data: [] }

    // 5. Get all payments for these tenancies
    const tenancyIds = (activeTenancies || []).map(t => t.id)
    const { data: allPayments } = tenancyIds.length
      ? await db.from('payments').select('id, tenancy_id, amount, status').in('tenancy_id', tenancyIds)
      : { data: [] }

    // Attach property names to units
    const unitsWithProps = (units || []).map(u => ({
      ...u,
      propertyName: props?.find(p => p.id === u.property_id)?.name || '',
      total_rent: parseFloat(u.monthly_rent || 0) + parseFloat(u.electricity_charges || 0) + parseFloat(u.water_charges || 0)
    }))

    // Attach payments to tenancies for outstanding calc
    const tenanciesWithPayments = (activeTenancies || []).map(t => ({
      ...t,
      payments: (allPayments || []).filter(p => p.tenancy_id === t.id)
    }))

    setTenants(tenantProfiles || [])
    setTenancies(tenanciesWithPayments)
    setVacantUnits(unitsWithProps.filter(u => !u.is_occupied))
    setLoading(false)
  }

  // Get tenancy for a tenant (if assigned)
  function getTenancy(tenantId) {
    return tenancies.find(t => t.tenant_id === tenantId) || null
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setErr(''); setSuccessMsg(''); setModal('create')
  }

  function openEdit(tenant) {
    setEditTarget(tenant)
    setEditForm({
      full_name:               tenant.full_name               || '',
      email:                   tenant.email                   || '',
      phone:                   tenant.phone                   || '',
      nic:                     tenant.nic                     || '',
      address:                 tenant.address                 || '',
      emergency_contact_name:  tenant.emergency_contact_name  || '',
      emergency_contact_phone: tenant.emergency_contact_phone || '',
      photo:                   tenant.photo                   || null,
    })
    setErr(''); setModal('edit')
  }

  function openAssign(tenantId) {
    setAssignForm({
      tenant_id: tenantId,
      unit_id: '', monthly_rent: '',
      start_date: new Date().toISOString().split('T')[0],
      deposit_amount: '', rent_due_day: '1', notes: ''
    })
    setErr(''); setModal('assign')
  }

  async function handleCreate() {
    if (!createForm.username)  { setErr('Username is required.'); return }
    if (!createForm.password)  { setErr('Password is required.'); return }
    if (!createForm.full_name) { setErr('Full name is required.'); return }
    if (!createForm.phone)     { setErr('Phone number is required.'); return }
    if (createForm.password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      await createTenantOnLandlordDb(db, profile.id, {
        username:             createForm.username,
        password:             createForm.password,
        fullName:             createForm.full_name,
        email:                createForm.email,
        phone:                createForm.phone,
        nic:                  createForm.nic,
        address:              createForm.address,
        emergencyContactName: createForm.emergency_contact_name,
        emergencyContactPhone:createForm.emergency_contact_phone,
        photo:                createForm.photo,
      })
      setSuccessMsg(`✓ Tenant created! Username: ${createForm.username}`)
      setCreateForm(EMPTY_CREATE)
      fetchData()
    } catch (e) {
      setErr(e.message || 'Failed to create tenant.')
    }
    setSaving(false)
  }

  async function handleEdit() {
    if (!editForm.full_name) { setErr('Full name is required.'); return }
    if (!editForm.phone)     { setErr('Phone number is required.'); return }
    setSaving(true); setErr('')
    const { error } = await db.from('profiles').update({
      full_name:               editForm.full_name.trim(),
      email:                   editForm.email.trim()   || null,
      phone:                   editForm.phone.trim()   || null,
      nic:                     editForm.nic.trim()     || null,
      address:                 editForm.address.trim() || null,
      emergency_contact_name:  editForm.emergency_contact_name.trim()  || null,
      emergency_contact_phone: editForm.emergency_contact_phone.trim() || null,
      photo:                   editForm.photo          || null,
    }).eq('id', editTarget.id)
    if (error) { setErr(error.message); setSaving(false); return }
    setModal(false)
    fetchData()
    setSaving(false)
  }

  async function handleAssign() {
    if (!assignForm.tenant_id || !assignForm.unit_id || !assignForm.monthly_rent || !assignForm.start_date) {
      setErr('Tenant, unit, rent and start date are required.'); return
    }
    setSaving(true); setErr('')
    const { error } = await db.from('tenancies').insert({
      unit_id:        assignForm.unit_id,
      tenant_id:      assignForm.tenant_id,
      start_date:     assignForm.start_date,
      monthly_rent:   parseFloat(assignForm.monthly_rent),
      deposit_amount: parseFloat(assignForm.deposit_amount || 0),
      rent_due_day:   parseInt(assignForm.rent_due_day || 1),
      notes:          assignForm.notes,
      is_active:      true,
    })
    if (error) { setErr(error.message); setSaving(false); return }
    await db.from('units').update({ is_occupied: true }).eq('id', assignForm.unit_id)
    setModal(false)
    fetchData()
    setSaving(false)
  }

  async function toggleActive(tenant) {
    if (!confirm(`${tenant.is_active ? 'Deactivate' : 'Activate'} ${tenant.full_name}?`)) return
    await db.from('profiles').update({ is_active: !tenant.is_active }).eq('id', tenant.id)
    fetchData()
  }

  async function endTenancy(tenancy) {
    if (!confirm('End this tenancy? The unit will be marked as vacant.')) return
    await db.from('tenancies').update({ is_active: false, end_date: new Date().toISOString().split('T')[0] }).eq('id', tenancy.id)
    await db.from('units').update({ is_occupied: false }).eq('id', tenancy.unit_id)
    fetchData()
  }

  const setC = f => e => setCreateForm(x => ({ ...x, [f]: e.target.value }))
  const setE = f => e => setEditForm(x => ({ ...x, [f]: e.target.value }))
  const setA = f => e => setAssignForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Tenants" sub="All tenants under your properties">
        <Button onClick={openCreate}>+ Create Tenant</Button>
      </PageHeader>

      {fetchErr && (
        <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'12px 16px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
          {fetchErr}
        </div>
      )}

      {successMsg && (
        <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 16px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
          {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
          <div style={{ width:28, height:28, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <Table
          headers={['Tenant', 'Contact', 'NIC', 'Status', 'Unit', 'Outstanding', 'Actions']}
          empty={{ title:'No tenants yet', sub:'Create a tenant account to get started.' }}>
          {tenants.map(t => {
            const tenancy = getTenancy(t.id)
            const isAssigned = !!tenancy

            return (
              <Tr key={t.id}>
                {/* Name + photo */}
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {t.photo ? (
                      <img src={t.photo} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--border)', flexShrink:0 }} />
                    ) : (
                      <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>👤</div>
                    )}
                    <div>
                      <div style={{ fontWeight:500 }}>{t.full_name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>@{t.username || '—'}</div>
                    </div>
                  </div>
                </Td>

                {/* Contact */}
                <Td>
                  <div style={{ fontSize:13, color:'var(--text2)' }}>{t.phone || '—'}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{t.email || '—'}</div>
                </Td>

                {/* NIC */}
                <Td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text2)' }}>{t.nic || '—'}</Td>

                {/* Status */}
                <Td>
                  {!t.is_active ? (
                    <Badge variant="red">Inactive</Badge>
                  ) : isAssigned ? (
                    <Badge variant="green">Assigned</Badge>
                  ) : (
                    <Badge variant="amber">Unassigned</Badge>
                  )}
                </Td>

                {/* Unit */}
                <Td>
                  {isAssigned ? (
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{tenancy.units?.unit_number}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{LKR(tenancy.monthly_rent)}/mo</div>
                    </div>
                  ) : (
                    <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>
                  )}
                </Td>

                {/* Outstanding */}
                <Td>
                  {isAssigned ? (() => {
                    const outstanding = calcOutstanding(tenancy, tenancy.units, tenancy.payments || [])
                    return outstanding > 0
                      ? <span style={{ fontFamily:'monospace', fontSize:13, color:'var(--red-text)', fontWeight:600 }}>{LKR(outstanding)}</span>
                      : <span style={{ fontSize:12, color:'var(--green-text)' }}>✓ Clear</span>
                  })() : <span style={{ color:'var(--text3)', fontSize:12 }}>—</span>}
                </Td>

                {/* Actions */}
                <Td>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                    {t.is_active && !isAssigned && (
                      <Button size="sm" variant="ghost" onClick={() => openAssign(t.id)}>Assign Unit</Button>
                    )}
                    {isAssigned && (
                      <Button size="sm" variant="danger" onClick={() => endTenancy(tenancy)}>End Tenancy</Button>
                    )}
                    <Button size="sm" variant={t.is_active ? 'danger' : 'success'} onClick={() => toggleActive(t)}>
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      )}

      {/* ── Create Tenant Modal ── */}
      <Modal open={modal === 'create'} onClose={() => setModal(false)} title="Create Tenant Account" maxWidth={520}>
        {successMsg && modal === 'create' ? (
          <div>
            <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 14px', borderRadius:'var(--radius)', marginBottom:16 }}>{successMsg}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth onClick={() => { setSuccessMsg(''); setCreateForm(EMPTY_CREATE) }}>Create Another</Button>
              <Button variant="ghost" onClick={() => { setSuccessMsg(''); setModal(false) }}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ background:'var(--blue-bg)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:'1rem', fontSize:13, color:'var(--blue-text)' }}>
              ℹ️ Set a username and temporary password. The tenant will change their password on first login.
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Login Credentials</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Username *"       value={createForm.username} onChange={setC('username')} placeholder="e.g. kasun123" hint="Used to log in" />
              <Input label="Temp Password *"  type="password" value={createForm.password} onChange={setC('password')} placeholder="Min 6 characters" />
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', margin:'12px 0 8px', paddingTop:8, borderTop:'1px solid var(--border)' }}>Personal Information</div>
            <Input label="Full Name *" value={createForm.full_name} onChange={setC('full_name')} placeholder="e.g. Kasun Silva" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Phone *"        value={createForm.phone} onChange={setC('phone')} placeholder="0771234567" />
              <Input label="NIC / Passport" value={createForm.nic}   onChange={setC('nic')}   placeholder="National ID" />
            </div>
            <Input label="Email (optional)" type="email" value={createForm.email} onChange={setC('email')} placeholder="tenant@example.com" />
            <Input label="Address"          value={createForm.address} onChange={setC('address')} placeholder="Permanent address" />
            <ImageInput label="Photo (optional)" value={createForm.photo} onChange={v => setCreateForm(f => ({ ...f, photo: v }))} hint="Auto compressed" />
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', margin:'12px 0 8px', paddingTop:8, borderTop:'1px solid var(--border)' }}>Emergency Contact (Optional)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Contact Name"  value={createForm.emergency_contact_name}  onChange={setC('emergency_contact_name')}  placeholder="Name" />
              <Input label="Contact Phone" value={createForm.emergency_contact_phone} onChange={setC('emergency_contact_phone')} placeholder="Phone" />
            </div>
            {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', margin:'12px 0' }}>{err}</div>}
            <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
              <Button fullWidth loading={saving} onClick={handleCreate}>Create Tenant</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Edit Tenant Modal ── */}
      <Modal open={modal === 'edit'} onClose={() => setModal(false)} title="Edit Tenant" maxWidth={520}>
        {editTarget && (() => {
          const tenancy = getTenancy(editTarget.id)
          return (
            <>
              {/* Tenancy Info (read-only) */}
              {tenancy && (
                <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'12px 14px', marginBottom:'1rem', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Current Tenancy</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      ['Unit',           tenancy.units?.unit_number || '—'],
                      ['Monthly Rent',   LKR(tenancy.monthly_rent)],
                      ['Rent Due Day',   `${tenancy.rent_due_day || 1}${['st','nd','rd'][((tenancy.rent_due_day||1)%10)-1] || 'th'} of month`],
                      ['Start Date',     tenancy.start_date ? new Date(tenancy.start_date).toLocaleDateString('en-LK') : '—'],
                      ['Deposit',        LKR(tenancy.deposit_amount || 0)],
                      ['Notes',          tenancy.notes || '—'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background:'var(--surface)', borderRadius:'var(--radius)', padding:'8px 10px' }}>
                        <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Info */}
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Personal Information</div>
              <Input label="Full Name *" value={editForm.full_name} onChange={setE('full_name')} placeholder="e.g. Kasun Silva" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Input label="Phone *"        value={editForm.phone} onChange={setE('phone')} placeholder="0771234567" />
                <Input label="NIC / Passport" value={editForm.nic}   onChange={setE('nic')}   placeholder="National ID" />
              </div>
              <Input label="Email (optional)" type="email" value={editForm.email}   onChange={setE('email')}   placeholder="tenant@example.com" />
              <Input label="Address"                       value={editForm.address} onChange={setE('address')} placeholder="Permanent address" />
              <ImageInput label="Photo" value={editForm.photo} onChange={v => setEditForm(f => ({ ...f, photo: v }))} hint="Auto compressed" />
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', margin:'12px 0 8px', paddingTop:8, borderTop:'1px solid var(--border)' }}>Emergency Contact</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Input label="Contact Name"  value={editForm.emergency_contact_name}  onChange={setE('emergency_contact_name')}  placeholder="Name" />
                <Input label="Contact Phone" value={editForm.emergency_contact_phone} onChange={setE('emergency_contact_phone')} placeholder="Phone" />
              </div>
              {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', margin:'12px 0' }}>{err}</div>}
              <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
                <Button fullWidth loading={saving} onClick={handleEdit}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
              </div>
            </>
          )
        })()}
      </Modal>

      {/* ── Assign Unit Modal ── */}
      <Modal open={modal === 'assign'} onClose={() => setModal(false)} title="Assign Unit to Tenant" maxWidth={480}>
        <Select label="Select Unit *" value={assignForm.unit_id} onChange={e => {
          const u = vacantUnits.find(u => u.id === e.target.value)
          const total = u ? parseFloat(u.monthly_rent||0) + parseFloat(u.electricity_charges||0) + parseFloat(u.water_charges||0) : ''
          setAssignForm(f => ({ ...f, unit_id: e.target.value, monthly_rent: total || '' }))
        }}>
          <option value="">Choose a vacant unit</option>
          {vacantUnits.map(u => (
            <option key={u.id} value={u.id}>{u.propertyName} — {u.unit_number} ({LKR(u.total_rent)}/mo)</option>
          ))}
        </Select>

        {/* Rent breakdown */}
        {assignForm.unit_id && (() => {
          const u = vacantUnits.find(u => u.id === assignForm.unit_id)
          if (!u) return null
          const elec  = parseFloat(u.electricity_charges || 0)
          const water = parseFloat(u.water_charges || 0)
          if (elec === 0 && water === 0) return null
          return (
            <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:12, color:'var(--text2)', marginBottom:'0.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span>Monthly Rent</span><span>{LKR(u.monthly_rent)}</span>
              </div>
              {elec > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span>Electricity</span><span>{LKR(elec)}</span>
              </div>}
              {water > 0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span>Water</span><span>{LKR(water)}</span>
              </div>}
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, borderTop:'1px solid var(--border)', paddingTop:6, marginTop:4 }}>
                <span>Total</span><span>{LKR(u.total_rent)}</span>
              </div>
            </div>
          )
        })()}

        <Input label="Total Monthly Rent (LKR) *" type="number" value={assignForm.monthly_rent} onChange={setA('monthly_rent')} hint="Auto-calculated from unit — edit if needed" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Start Date *"         type="date"   value={assignForm.start_date}    onChange={setA('start_date')} />
          <Input label="Rent Due Day *"        type="number" value={assignForm.rent_due_day}  onChange={setA('rent_due_day')} hint="Day of month (1–28)" min="1" max="28" />
        </div>
        <Input label="Security Deposit (LKR)" type="number" value={assignForm.deposit_amount} onChange={setA('deposit_amount')} placeholder="0" />
        <Input label="Notes"                              value={assignForm.notes}            onChange={setA('notes')}           placeholder="Optional notes" />
        {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} onClick={handleAssign}>Assign Unit</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
