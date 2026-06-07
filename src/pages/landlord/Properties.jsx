import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import ImageInput from '../../components/ui/ImageInput'

const SL_DISTRICTS = ['Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya','Mullaitivu','Batticaloa','Ampara','Trincomalee','Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle']
const PROPERTY_TYPES = ['Residential','Commercial','Industrial','Mixed Use']
const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits:2 })}`

export default function Properties() {
  const { profile, db } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [unitModal, setUnitModal]   = useState(null)
  const [editUnitModal, setEditUnitModal] = useState(null)
  const [editing, setEditing]       = useState(null)
  const [form, setForm] = useState({ property_code:'', name:'', address:'', city:'', district:'', country:'Sri Lanka', property_type:'Residential', image:null })
  const [unitForm, setUnitForm] = useState({ unit_number:'', floor:'', monthly_rent:'', electricity_charges:'', water_charges:'', deposit_amount:'', description:'' })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [fetchErr, setFetchErr] = useState('')

  useEffect(() => { fetchProperties() }, [db])

  async function fetchProperties() {
    setFetchErr('')
    // Fetch properties first
    const { data: props, error: propErr } = await db
      .from('properties')
      .select('*')
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })

    if (propErr) {
      setFetchErr(`Error loading properties: ${propErr.message}`)
      setLoading(false)
      return
    }

    // Fetch units separately to avoid RLS join issues
    if (props && props.length > 0) {
      const propIds = props.map(p => p.id)
      const { data: units, error: unitErr } = await db
        .from('units')
        .select('id, unit_number, floor, monthly_rent, electricity_charges, water_charges, deposit_amount, is_occupied, description, property_id')
        .in('property_id', propIds)

      if (!unitErr) {
        // Attach units to their properties
        const propsWithUnits = props.map(p => ({
          ...p,
          units: units?.filter(u => u.property_id === p.id) || []
        }))
        setProperties(propsWithUnits)
      } else {
        setProperties(props.map(p => ({ ...p, units: [] })))
      }
    } else {
      setProperties([])
    }
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ property_code:'', name:'', address:'', city:'', district:'', country:'Sri Lanka', property_type:'Residential', image:null })
    setErr(''); setModal(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ property_code: p.property_code||'', name: p.name, address: p.address, city: p.city, district: p.district||'', country: p.country||'Sri Lanka', property_type: p.property_type||'Residential', image: p.image||null })
    setErr(''); setModal(true)
  }

  async function saveProperty() {
    if (!form.name || !form.address || !form.city) { setErr('Name, address and city are required.'); return }
    setSaving(true); setErr('')
    const payload = {
      property_code: form.property_code || null,
      name:          form.name,
      address:       form.address,
      city:          form.city,
      district:      form.district      || null,
      country:       form.country       || 'Sri Lanka',
      property_type: form.property_type || 'Residential',
      image:         form.image         || null,
    }
    let error
    if (editing) {
      ;({ error } = await db.from('properties').update(payload).eq('id', editing.id))
    } else {
      ;({ error } = await db.from('properties').insert({ ...payload, landlord_id: profile.id }))
    }
    if (error) {
      setErr(error.message || 'Failed to save property.')
    } else {
      setSuccessMsg(editing ? '✓ Property updated successfully.' : '✓ Property added successfully.')
      setModal(false)
      fetchProperties()
      setTimeout(() => setSuccessMsg(''), 4000)
    }
    setSaving(false)
  }

  async function deleteProperty(id) {
    if (!confirm('Delete this property and all its units? This cannot be undone.')) return
    await db.from('properties').delete().eq('id', id)
    fetchProperties()
  }

  function openAddUnit(prop) {
    setUnitModal(prop)
    setUnitForm({ unit_number:'', floor:'', monthly_rent:'', electricity_charges:'0', water_charges:'0', deposit_amount:'0', description:'' })
    setErr('')
  }

  function openEditUnit(unit, prop) {
    setEditUnitModal({ unit, prop })
    setUnitForm({
      unit_number: unit.unit_number,
      floor: unit.floor || '',
      monthly_rent: unit.monthly_rent,
      electricity_charges: unit.electricity_charges || '0',
      water_charges: unit.water_charges || '0',
      deposit_amount: unit.deposit_amount || '0',
      description: unit.description || '',
    })
    setErr('')
  }

  async function saveUnit() {
    if (!unitForm.unit_number || !unitForm.monthly_rent) { setErr('Unit number and monthly rent are required.'); return }
    setSaving(true); setErr('')
    const payload = {
      unit_number: unitForm.unit_number,
      floor: unitForm.floor,
      monthly_rent: parseFloat(unitForm.monthly_rent),
      electricity_charges: parseFloat(unitForm.electricity_charges || 0),
      water_charges: parseFloat(unitForm.water_charges || 0),
      deposit_amount: parseFloat(unitForm.deposit_amount || 0),
      description: unitForm.description,
    }
    if (editUnitModal) {
      await db.from('units').update(payload).eq('id', editUnitModal.unit.id)
      setEditUnitModal(null)
    } else {
      await db.from('units').insert({ ...payload, property_id: unitModal.id })
      setUnitModal(null)
    }
    setSaving(false)
    fetchProperties()
  }

  async function deleteUnit(unitId, isOccupied) {
    if (isOccupied) { alert('Cannot delete an occupied unit. End the tenancy first.'); return }
    if (!confirm('Delete this unit?')) return
    await db.from('units').delete().eq('id', unitId)
    fetchProperties()
  }

  const set  = f => e => setForm(x => ({ ...x, [f]: e.target.value }))
  const setU = f => e => setUnitForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Properties" sub="Manage your rental properties and units"
        action={<Button onClick={openAdd}>+ Add Property</Button>} />

      {successMsg && (
        <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 16px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
          {successMsg}
        </div>
      )}
      {fetchErr && (
        <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'12px 16px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
          {fetchErr}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
          <div style={{ width:28, height:28, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : properties.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem', background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏘</div>
          <p style={{ fontWeight:500, marginBottom:6 }}>No properties yet</p>
          <p style={{ color:'var(--text2)', fontSize:14, marginBottom:16 }}>Add your first property to get started.</p>
          <Button onClick={openAdd}>+ Add Property</Button>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'1.25rem' }}>
          {properties.map((p, i) => {
            const occupied = p.units?.filter(u => u.is_occupied).length || 0
            const total    = p.units?.length || 0
            return (
              <Card key={p.id} className={`fade-up fade-up-${Math.min(i+1,7)}`}>
                {p.image && (
                  <img src={p.image} alt={p.name} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:'var(--radius)', marginBottom:'1rem', border:'1px solid var(--border)' }} />
                )}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', marginBottom:'1rem' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <h3 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.2rem', fontWeight:400 }}>{p.name}</h3>
                      {p.property_code && <span style={{ fontSize:11, background:'var(--surface2)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:4, color:'var(--text3)', fontFamily:'monospace' }}>{p.property_code}</span>}
                      <Badge variant="default">{p.property_type || 'Residential'}</Badge>
                    </div>
                    <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>{p.address}, {p.city}{p.district ? `, ${p.district}` : ''}{p.country && p.country !== 'Sri Lanka' ? `, ${p.country}` : ''}</p>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <Badge variant={occupied === total && total > 0 ? 'green' : 'amber'}>{occupied}/{total} occupied</Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => openAddUnit(p)}>+ Unit</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteProperty(p.id)}>Delete</Button>
                  </div>
                </div>

                {p.units?.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:8 }}>
                    {p.units.map(u => (
                      <div key={u.id} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'12px', border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <div style={{ fontWeight:500, fontSize:14 }}>{u.unit_number}</div>
                          <Badge variant={u.is_occupied ? 'green' : 'amber'}>{u.is_occupied ? 'Occupied' : 'Vacant'}</Badge>
                        </div>
                        {u.floor && <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>Floor: {u.floor}</div>}
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{LKR(u.monthly_rent)}/mo</div>
                        {(u.electricity_charges > 0 || u.water_charges > 0) && (
                          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                            {u.electricity_charges > 0 && `⚡ ${LKR(u.electricity_charges)} `}
                            {u.water_charges > 0 && `💧 ${LKR(u.water_charges)}`}
                          </div>
                        )}
                        {!u.is_occupied && (
                          <div style={{ display:'flex', gap:4, marginTop:8 }}>
                            <Button size="sm" variant="ghost" onClick={() => openEditUnit(u, p)} style={{ flex:1, fontSize:11 }}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => deleteUnit(u.id, u.is_occupied)} style={{ fontSize:11 }}>Del</Button>
                          </div>
                        )}
                        {u.is_occupied && (
                          <Button size="sm" variant="ghost" onClick={() => openEditUnit(u, p)} style={{ width:'100%', marginTop:8, fontSize:11 }}>Edit</Button>
                        )}
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
        <ImageInput label="Property Image" value={form.image} onChange={v => setForm(f => ({ ...f, image: v }))} hint="Optional — auto compressed" />
        <Input label="Property Name *" value={form.name} onChange={set('name')} placeholder="e.g. Perera Residencies" />
        <Input label="Property Code" value={form.property_code} onChange={set('property_code')} placeholder="e.g. PR-001 (optional)" hint="Short reference code for this property" />
        <Input label="Address *" value={form.address} onChange={set('address')} placeholder="Street address" />
        <Input label="City *" value={form.city} onChange={set('city')} placeholder="e.g. Colombo" />
        <Select label="District" value={form.district} onChange={set('district')}>
          <option value="">Select district</option>
          {SL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Input label="Country" value={form.country} onChange={set('country')} placeholder="Sri Lanka" hint="Default: Sri Lanka. Change for other countries." />
        <Select label="Property Type" value={form.property_type} onChange={set('property_type')}>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        {err && <p style={{ color:'var(--red)', fontSize:13, marginBottom:12 }}>{err}</p>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} onClick={saveProperty}>Save Property</Button>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Add Unit Modal */}
      <Modal open={!!unitModal} onClose={() => setUnitModal(null)} title={`Add Unit — ${unitModal?.name}`}>
        <Input label="Unit Number *" value={unitForm.unit_number} onChange={setU('unit_number')} placeholder="e.g. Unit 3A, Room 2" />
        <Input label="Floor" value={unitForm.floor} onChange={setU('floor')} placeholder="e.g. Ground Floor, 1st Floor" />
        <Input label="Monthly Rent (LKR) *" type="number" value={unitForm.monthly_rent} onChange={setU('monthly_rent')} placeholder="e.g. 25000" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Electricity Charges (LKR)" type="number" value={unitForm.electricity_charges} onChange={setU('electricity_charges')} placeholder="0" />
          <Input label="Water Charges (LKR)" type="number" value={unitForm.water_charges} onChange={setU('water_charges')} placeholder="0" />
        </div>
        <Input label="Security Deposit (LKR)" type="number" value={unitForm.deposit_amount} onChange={setU('deposit_amount')} placeholder="0" />
        <Input label="Description" value={unitForm.description} onChange={setU('description')} placeholder="Optional notes about this unit" />
        {err && <p style={{ color:'var(--red)', fontSize:13, marginBottom:12 }}>{err}</p>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} onClick={saveUnit}>Add Unit</Button>
          <Button variant="ghost" onClick={() => setUnitModal(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Edit Unit Modal */}
      <Modal open={!!editUnitModal} onClose={() => setEditUnitModal(null)} title={`Edit Unit — ${editUnitModal?.unit?.unit_number}`}>
        <Input label="Unit Number *" value={unitForm.unit_number} onChange={setU('unit_number')} placeholder="e.g. Unit 3A" />
        <Input label="Floor" value={unitForm.floor} onChange={setU('floor')} placeholder="e.g. Ground Floor" />
        <Input label="Monthly Rent (LKR) *" type="number" value={unitForm.monthly_rent} onChange={setU('monthly_rent')} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Electricity (LKR)" type="number" value={unitForm.electricity_charges} onChange={setU('electricity_charges')} />
          <Input label="Water (LKR)" type="number" value={unitForm.water_charges} onChange={setU('water_charges')} />
        </div>
        <Input label="Deposit (LKR)" type="number" value={unitForm.deposit_amount} onChange={setU('deposit_amount')} />
        <Input label="Description" value={unitForm.description} onChange={setU('description')} />
        {err && <p style={{ color:'var(--red)', fontSize:13, marginBottom:12 }}>{err}</p>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} onClick={saveUnit}>Save Changes</Button>
          <Button variant="ghost" onClick={() => setEditUnitModal(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  )
}
