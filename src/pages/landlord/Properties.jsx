import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const SL_DISTRICTS = ['Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya','Mullaitivu','Batticaloa','Ampara','Trincomalee','Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle']

export default function Properties() {
  const { profile } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [unitModal, setUnitModal] = useState(null) // property object
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', city: '', district: '' })
  const [unitForm, setUnitForm] = useState({ unit_number: '', floor: '', monthly_rent: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetchProperties() }, [])

  async function fetchProperties() {
    const { data } = await supabase
      .from('properties')
      .select('*, units(id, unit_number, monthly_rent, is_occupied)')
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })
    setProperties(data || [])
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm({ name: '', address: '', city: '', district: '' }); setErr(''); setModal(true) }
  function openEdit(p) { setEditing(p); setForm({ name: p.name, address: p.address, city: p.city, district: p.district || '' }); setErr(''); setModal(true) }

  async function saveProperty() {
    if (!form.name || !form.address || !form.city) { setErr('Name, address and city are required.'); return }
    setSaving(true); setErr('')
    try {
      if (editing) {
        await supabase.from('properties').update(form).eq('id', editing.id)
      } else {
        await supabase.from('properties').insert({ ...form, landlord_id: profile.id })
      }
      setModal(false); fetchProperties()
    } catch { setErr('Failed to save.') }
    setSaving(false)
  }

  async function deleteProperty(id) {
    if (!confirm('Delete this property and all its units? This cannot be undone.')) return
    await supabase.from('properties').delete().eq('id', id)
    fetchProperties()
  }

  async function addUnit() {
    if (!unitForm.unit_number || !unitForm.monthly_rent) { setErr('Unit number and rent are required.'); return }
    setSaving(true); setErr('')
    await supabase.from('units').insert({ ...unitForm, property_id: unitModal.id, monthly_rent: parseFloat(unitForm.monthly_rent) })
    setSaving(false); setUnitModal(null); setUnitForm({ unit_number: '', floor: '', monthly_rent: '', description: '' }); fetchProperties()
  }

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))
  const setU = f => e => setUnitForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Properties" sub="Manage your rental properties and units"
        action={<Button onClick={openAdd}>+ Add Property</Button>} />

      {loading ? <p style={{ color: 'var(--text3)' }}>Loading...</p> : properties.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏘</div>
          <p style={{ fontWeight: 500, marginBottom: 6 }}>No properties yet</p>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>Add your first property to get started.</p>
          <Button onClick={openAdd}>+ Add Property</Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {properties.map((p, i) => {
            const occupied = p.units?.filter(u => u.is_occupied).length || 0
            const total = p.units?.length || 0
            return (
              <Card key={p.id} className={`fade-up fade-up-${i + 1}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.2rem', fontWeight: 400 }}>{p.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{p.address}, {p.city}{p.district ? `, ${p.district}` : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant={occupied === total && total > 0 ? 'green' : 'amber'}>{occupied}/{total} occupied</Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setUnitModal(p); setErr('') }}>+ Unit</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteProperty(p.id)}>Delete</Button>
                  </div>
                </div>
                {p.units?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                    {p.units.map(u => (
                      <div key={u.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{u.unit_number}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>LKR {Number(u.monthly_rent).toLocaleString()}/mo</div>
                        <div style={{ marginTop: 6 }}><Badge variant={u.is_occupied ? 'green' : 'amber'}>{u.is_occupied ? 'Occupied' : 'Vacant'}</Badge></div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Property Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Property' : 'Add Property'}>
        <Input label="Property Name *" value={form.name} onChange={set('name')} placeholder="e.g. Perera Residencies" />
        <Input label="Address *" value={form.address} onChange={set('address')} placeholder="Street address" />
        <Input label="City *" value={form.city} onChange={set('city')} placeholder="e.g. Colombo" />
        <Select label="District" value={form.district} onChange={set('district')}>
          <option value="">Select district</option>
          {SL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button fullWidth loading={saving} onClick={saveProperty}>Save Property</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Add Unit Modal */}
      <Modal open={!!unitModal} onClose={() => setUnitModal(null)} title={`Add Unit — ${unitModal?.name}`}>
        <Input label="Unit Number *" value={unitForm.unit_number} onChange={setU('unit_number')} placeholder="e.g. Unit 3A, Room 2" />
        <Input label="Floor" value={unitForm.floor} onChange={setU('floor')} placeholder="e.g. Ground, 1st" />
        <Input label="Monthly Rent (LKR) *" type="number" value={unitForm.monthly_rent} onChange={setU('monthly_rent')} placeholder="e.g. 25000" />
        <Input label="Description" value={unitForm.description} onChange={setU('description')} placeholder="Optional notes" />
        {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button fullWidth loading={saving} onClick={addUnit}>Add Unit</Button>
          <Button variant="ghost" onClick={() => setUnitModal(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
