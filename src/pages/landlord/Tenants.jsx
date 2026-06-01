import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, createUser } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

export default function Tenants() {
  const { profile } = useAuth()
  const [tenancies, setTenancies]   = useState([])
  const [vacantUnits, setVacantUnits] = useState([])
  const [allTenants, setAllTenants] = useState([]) // existing tenant profiles
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false) // 'create' | 'assign' | false
  const [detailModal, setDetailModal] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Create tenant form
  const [createForm, setCreateForm] = useState({
    full_name:'', email:'', phone:'', nic:'', address:'', emergency_contact_name:'', emergency_contact_phone:''
  })

  // Assign tenancy form
  const [assignForm, setAssignForm] = useState({
    tenant_id:'', unit_id:'', monthly_rent:'', start_date: new Date().toISOString().split('T')[0], deposit_amount:'', notes:''
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', profile.id)
    const pIds = (props || []).map(p => p.id)
    if (!pIds.length) { setLoading(false); return }

    const { data: units } = await supabase.from('units')
      .select('id, unit_number, monthly_rent, is_occupied, property_id, properties(name)')
      .in('property_id', pIds)

    const { data: ten } = await supabase.from('tenancies')
      .select('*, units(unit_number, properties(name)), profiles:tenant_id(id, full_name, phone, nic, email, address, emergency_contact_name, emergency_contact_phone, is_active)')
      .in('unit_id', (units||[]).map(u => u.id))
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Get all tenant profiles under this landlord (for assign dropdown)
    const tenantIds = (ten||[]).map(t => t.tenant_id)
    const { data: allTenantProfiles } = await supabase.from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tenant')
      .eq('is_active', true)

    setTenancies(ten || [])
    setVacantUnits((units || []).filter(u => !u.is_occupied))
    setAllTenants(allTenantProfiles || [])
    setLoading(false)
  }

  function openCreateModal() {
    setCreateForm({ full_name:'', email:'', phone:'', nic:'', address:'', emergency_contact_name:'', emergency_contact_phone:'' })
    setErr(''); setSuccessMsg(''); setModal('create')
  }

  function openAssignModal() {
    setAssignForm({ tenant_id:'', unit_id:'', monthly_rent:'', start_date: new Date().toISOString().split('T')[0], deposit_amount:'', notes:'' })
    setErr(''); setModal('assign')
  }

  async function handleCreateTenant() {
    if (!createForm.full_name || !createForm.email) { setErr('Full name and email are required.'); return }
    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      await createUser({
        email: createForm.email,
        fullName: createForm.full_name,
        phone: createForm.phone,
        nic: createForm.nic,
        role: 'tenant',
        address: createForm.address,
        emergencyContactName: createForm.emergency_contact_name,
        emergencyContactPhone: createForm.emergency_contact_phone,
      })
      setSuccessMsg(`✓ Tenant account created! A password setup email has been sent to ${createForm.email}.`)
      setCreateForm({ full_name:'', email:'', phone:'', nic:'', address:'', emergency_contact_name:'', emergency_contact_phone:'' })
      fetchData()
    } catch (e) {
      setErr(e.message || 'Failed to create tenant.')
    }
    setSaving(false)
  }

  async function handleAssignTenant() {
    if (!assignForm.tenant_id || !assignForm.unit_id || !assignForm.monthly_rent || !assignForm.start_date) {
      setErr('Tenant, unit, rent and start date are required.'); return
    }
    setSaving(true); setErr('')
    try {
      await supabase.from('tenancies').insert({
        unit_id: assignForm.unit_id,
        tenant_id: assignForm.tenant_id,
        start_date: assignForm.start_date,
        monthly_rent: parseFloat(assignForm.monthly_rent),
        deposit_amount: parseFloat(assignForm.deposit_amount || 0),
        notes: assignForm.notes,
        is_active: true,
      })
      await supabase.from('units').update({ is_occupied: true }).eq('id', assignForm.unit_id)
      setModal(false); fetchData()
    } catch (e) {
      setErr(e.message || 'Failed to assign tenant.')
    }
    setSaving(false)
  }

  async function endTenancy(id, unitId) {
    if (!confirm('End this tenancy? The unit will be marked as vacant.')) return
    await supabase.from('tenancies').update({ is_active: false, end_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    await supabase.from('units').update({ is_occupied: false }).eq('id', unitId)
    fetchData()
  }

  async function toggleTenantActive(tenantId, currentStatus) {
    await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', tenantId)
    fetchData()
  }

  const setC = f => e => setCreateForm(x => ({ ...x, [f]: e.target.value }))
  const setA = f => e => setAssignForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Tenants" sub="Active tenancies across your properties">
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="ghost" onClick={openAssignModal}>Assign Unit</Button>
          <Button onClick={openCreateModal}>+ Create Tenant</Button>
        </div>
      </PageHeader>

      <Table
        headers={['Tenant', 'Contact', 'NIC', 'Unit', 'Rent/mo', 'Since', 'Status', 'Actions']}
        empty={{ title:'No active tenants', sub:'Create a tenant account then assign them to a unit.' }}>
        {tenancies.map(t => (
          <Tr key={t.id}>
            <Td>
              <div style={{ fontWeight:500 }}>{t.profiles?.full_name || '—'}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>{t.units?.properties?.name}</div>
            </Td>
            <Td style={{ color:'var(--text2)', fontSize:13 }}>
              <div>{t.profiles?.phone || '—'}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{t.profiles?.email || ''}</div>
            </Td>
            <Td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text2)' }}>{t.profiles?.nic || '—'}</Td>
            <Td><Badge variant="blue">{t.units?.unit_number}</Badge></Td>
            <Td><span style={{ fontFamily:'monospace', fontSize:13 }}>{LKR(t.monthly_rent)}</span></Td>
            <Td style={{ color:'var(--text2)' }}>{t.start_date ? new Date(t.start_date).toLocaleDateString('en-LK') : '—'}</Td>
            <Td><Badge variant={t.profiles?.is_active ? 'green' : 'red'}>{t.profiles?.is_active ? 'Active' : 'Suspended'}</Badge></Td>
            <Td>
              <div style={{ display:'flex', gap:6 }}>
                <Button size="sm" variant="ghost" onClick={() => setDetailModal(t)}>View</Button>
                <Button size="sm" variant="danger" onClick={() => endTenancy(t.id, t.unit_id)}>End</Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {/* Create Tenant Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(false)} title="Create Tenant Account" maxWidth={520}>
        <div style={{ background:'var(--blue-bg)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:'1rem', fontSize:13, color:'var(--blue-text)' }}>
          ℹ️ A password setup email will be sent to the tenant. After creating, use "Assign Unit" to link them to a unit.
        </div>
        {successMsg ? (
          <div>
            <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 14px', borderRadius:'var(--radius)', marginBottom:16 }}>{successMsg}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth onClick={openAssignModal}>Assign to a Unit</Button>
              <Button variant="ghost" onClick={() => { setSuccessMsg(''); setModal(false) }}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Full Name *"    value={createForm.full_name} onChange={setC('full_name')} placeholder="e.g. Kasun Silva" />
              <Input label="Email *" type="email" value={createForm.email} onChange={setC('email')} placeholder="tenant@example.com" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Phone"          value={createForm.phone} onChange={setC('phone')} placeholder="0771234567" />
              <Input label="NIC / Passport" value={createForm.nic} onChange={setC('nic')} placeholder="National ID" />
            </div>
            <Input label="Address" value={createForm.address} onChange={setC('address')} placeholder="Permanent address" />
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:'1rem', marginTop:'0.5rem' }}>
              <p style={{ fontSize:12, color:'var(--text3)', marginBottom:'0.75rem' }}>Emergency Contact (Optional)</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Input label="Contact Name" value={createForm.emergency_contact_name} onChange={setC('emergency_contact_name')} placeholder="Name" />
                <Input label="Contact Phone" value={createForm.emergency_contact_phone} onChange={setC('emergency_contact_phone')} placeholder="Phone" />
              </div>
            </div>
            {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth loading={saving} onClick={handleCreateTenant}>Create Tenant</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Assign Unit Modal */}
      <Modal open={modal === 'assign'} onClose={() => setModal(false)} title="Assign Tenant to Unit" maxWidth={480}>
        <Select label="Select Tenant *" value={assignForm.tenant_id} onChange={setA('tenant_id')}>
          <option value="">Choose a tenant</option>
          {allTenants.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
        </Select>
        <Select label="Select Unit *" value={assignForm.unit_id} onChange={e => {
          const u = vacantUnits.find(u => u.id === e.target.value)
          setAssignForm(f => ({ ...f, unit_id: e.target.value, monthly_rent: u?.monthly_rent || '' }))
        }}>
          <option value="">Choose a vacant unit</option>
          {vacantUnits.map(u => <option key={u.id} value={u.id}>{u.properties?.name} — {u.unit_number} ({LKR(u.monthly_rent)}/mo)</option>)}
        </Select>
        <Input label="Monthly Rent (LKR) *" type="number" value={assignForm.monthly_rent} onChange={setA('monthly_rent')} hint="Can differ from unit base rent" />
        <Input label="Start Date *" type="date" value={assignForm.start_date} onChange={setA('start_date')} />
        <Input label="Security Deposit (LKR)" type="number" value={assignForm.deposit_amount} onChange={setA('deposit_amount')} placeholder="0" />
        <Input label="Notes" value={assignForm.notes} onChange={setA('notes')} placeholder="Optional notes" />
        {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} onClick={handleAssignTenant}>Assign Unit</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Tenancy Details" maxWidth={520}>
        {detailModal && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1rem' }}>
              {[
                ['Tenant Name',     detailModal.profiles?.full_name],
                ['Email',           detailModal.profiles?.email || '—'],
                ['Phone',           detailModal.profiles?.phone || '—'],
                ['NIC / Passport',  detailModal.profiles?.nic || '—'],
                ['Unit',            detailModal.units?.unit_number],
                ['Property',        detailModal.units?.properties?.name],
                ['Monthly Rent',    LKR(detailModal.monthly_rent)],
                ['Security Deposit', LKR(detailModal.deposit_amount || 0)],
                ['Start Date',      new Date(detailModal.start_date).toLocaleDateString('en-LK')],
                ['Status',          detailModal.profiles?.is_active ? 'Active' : 'Suspended'],
              ].map(([label, value]) => (
                <div key={label} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
                  <div style={{ fontWeight:500, fontSize:14 }}>{value}</div>
                </div>
              ))}
            </div>
            {detailModal.profiles?.address && (
              <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px', marginBottom:8 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>Address</div>
                <div style={{ fontSize:14 }}>{detailModal.profiles.address}</div>
              </div>
            )}
            {(detailModal.profiles?.emergency_contact_name || detailModal.profiles?.emergency_contact_phone) && (
              <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px', marginBottom:8 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>Emergency Contact</div>
                <div style={{ fontSize:14 }}>{detailModal.profiles?.emergency_contact_name} — {detailModal.profiles?.emergency_contact_phone}</div>
              </div>
            )}
            {detailModal.notes && <p style={{ fontSize:13, color:'var(--text2)', fontStyle:'italic', marginTop:8 }}>Notes: {detailModal.notes}</p>}
            <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
              <Button fullWidth variant="danger" onClick={() => { endTenancy(detailModal.id, detailModal.unit_id); setDetailModal(null) }}>End Tenancy</Button>
              <Button variant="ghost" onClick={() => setDetailModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
