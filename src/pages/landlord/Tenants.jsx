import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

export default function Tenants() {
  const { profile } = useAuth()
  const [tenancies, setTenancies] = useState([])
  const [vacantUnits, setVacantUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', nic: '', unit_id: '', monthly_rent: '', start_date: '', deposit_amount: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    // Get landlord's properties
    const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', profile.id)
    const pIds = (props || []).map(p => p.id)
    if (!pIds.length) { setLoading(false); return }

    // Get all units
    const { data: units } = await supabase.from('units')
      .select('id, unit_number, monthly_rent, is_occupied, property_id, properties(name)')
      .in('property_id', pIds)

    // Get active tenancies with tenant info
    const { data: ten } = await supabase.from('tenancies')
      .select('*, units(unit_number, properties(name)), profiles:tenant_id(full_name, phone, nic, id)')
      .in('unit_id', (units||[]).map(u=>u.id))
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setTenancies(ten || [])
    setVacantUnits((units || []).filter(u => !u.is_occupied))
    setLoading(false)
  }

  function openAdd() {
    setForm({ email: '', full_name: '', phone: '', nic: '', unit_id: '', monthly_rent: '', start_date: new Date().toISOString().split('T')[0], deposit_amount: '', notes: '' })
    setErr(''); setModal(true)
  }

  async function saveTenant() {
    if (!form.email || !form.full_name || !form.unit_id || !form.monthly_rent || !form.start_date) {
      setErr('Email, name, unit, rent and start date are required.'); return
    }
    setSaving(true); setErr('')
    try {
      // 1. Create user account via Supabase Auth admin — use invite instead
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(form.email, {
        data: { full_name: form.full_name, role: 'tenant' }
      })
      // Note: admin.inviteUserByEmail requires service_role key — use RPC instead
      // We'll create a pending profile and let them register
      // For now insert profile directly if user exists, else note that tenant must register
      let tenantId = null

      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', (await supabase.auth.getUser()).data.user.id) // placeholder
        .single()

      // Practical approach: landlord enters existing tenant's registered email
      // System looks up their profile
      const { data: foundUsers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${form.full_name}%`)
        .eq('role', 'tenant')
        .limit(5)

      // For simplicity, we need tenant to have registered first
      // Update their profile details
      if (foundUsers && foundUsers.length > 0) {
        tenantId = foundUsers[0].id
        await supabase.from('profiles').update({ phone: form.phone, nic: form.nic }).eq('id', tenantId)
      } else {
        setErr('Tenant not found. The tenant must first register an account at your Ceylora URL, then you can assign them here. Search by their registered full name.')
        setSaving(false); return
      }

      // Create tenancy
      await supabase.from('tenancies').insert({
        unit_id: form.unit_id,
        tenant_id: tenantId,
        start_date: form.start_date,
        monthly_rent: parseFloat(form.monthly_rent),
        deposit_amount: parseFloat(form.deposit_amount || 0),
        notes: form.notes,
        is_active: true,
      })

      // Mark unit as occupied
      await supabase.from('units').update({ is_occupied: true }).eq('id', form.unit_id)

      setModal(false); fetchData()
    } catch (e) {
      setErr(e.message || 'Failed to create tenancy.')
    }
    setSaving(false)
  }

  async function endTenancy(id, unitId) {
    if (!confirm('End this tenancy? The unit will be marked as vacant.')) return
    await supabase.from('tenancies').update({ is_active: false, end_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    await supabase.from('units').update({ is_occupied: false }).eq('id', unitId)
    fetchData()
  }

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Tenants" sub="Active tenancies across all properties"
        action={<Button onClick={openAdd}>+ Assign Tenant</Button>} />

      <Table
        headers={['Tenant', 'NIC', 'Unit', 'Monthly Rent', 'Since', 'Contact', 'Actions']}
        empty={{ title: 'No active tenants', sub: 'Assign a tenant to a unit to get started.' }}>
        {tenancies.length > 0 && tenancies.map((t, i) => (
          <Tr key={t.id}>
            <Td>
              <div style={{ fontWeight: 500 }}>{t.profiles?.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t.units?.properties?.name}</div>
            </Td>
            <Td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)' }}>{t.profiles?.nic || '—'}</Td>
            <Td><Badge variant="blue">{t.units?.unit_number}</Badge></Td>
            <Td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>LKR {Number(t.monthly_rent).toLocaleString()}</span></Td>
            <Td style={{ color: 'var(--text2)' }}>{t.start_date ? new Date(t.start_date).toLocaleDateString('en-LK') : '—'}</Td>
            <Td style={{ color: 'var(--text2)', fontSize: 13 }}>{t.profiles?.phone || '—'}</Td>
            <Td>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setDetailModal(t)}>Detail</Button>
                <Button size="sm" variant="danger" onClick={() => endTenancy(t.id, t.unit_id)}>End</Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {/* Assign Tenant Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Assign Tenant to Unit" maxWidth={520}>
        <div style={{ background: 'var(--amber-bg)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: 'var(--amber-text)' }}>
          ⚠️ The tenant must first register an account at your Ceylora URL. Then search them by their registered full name below.
        </div>
        <Input label="Tenant Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="Must match their registered name exactly" />
        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="0771234567" />
        <Input label="NIC Number" value={form.nic} onChange={set('nic')} placeholder="Sri Lanka NIC" hint="Required for legal tenancy agreement" />
        <Select label="Assign Unit *" value={form.unit_id} onChange={e => { set('unit_id')(e); const u = vacantUnits.find(u => u.id === e.target.value); if(u) setForm(f=>({...f, monthly_rent: u.monthly_rent})) }}>
          <option value="">Select a vacant unit</option>
          {vacantUnits.map(u => <option key={u.id} value={u.id}>{u.properties?.name} — {u.unit_number} (LKR {Number(u.monthly_rent).toLocaleString()})</option>)}
        </Select>
        <Input label="Monthly Rent (LKR) *" type="number" value={form.monthly_rent} onChange={set('monthly_rent')} />
        <Input label="Start Date *" type="date" value={form.start_date} onChange={set('start_date')} />
        <Input label="Security Deposit (LKR)" type="number" value={form.deposit_amount} onChange={set('deposit_amount')} placeholder="0" />
        <Input label="Notes" value={form.notes} onChange={set('notes')} placeholder="Optional" />
        {err && <div style={{ background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 13, padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button fullWidth loading={saving} onClick={saveTenant}>Assign Tenant</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Tenancy Details">
        {detailModal && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              {[
                ['Tenant', detailModal.profiles?.full_name],
                ['Unit', detailModal.units?.unit_number],
                ['Property', detailModal.units?.properties?.name],
                ['Monthly Rent', `LKR ${Number(detailModal.monthly_rent).toLocaleString()}`],
                ['Deposit', `LKR ${Number(detailModal.deposit_amount || 0).toLocaleString()}`],
                ['Start Date', new Date(detailModal.start_date).toLocaleDateString('en-LK')],
                ['NIC', detailModal.profiles?.nic || '—'],
                ['Phone', detailModal.profiles?.phone || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
            {detailModal.notes && <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>{detailModal.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
