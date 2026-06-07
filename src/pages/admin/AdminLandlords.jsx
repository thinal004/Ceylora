import { useEffect, useState } from 'react'
import { supabase, createUser, evictDbCache } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

const EMPTY_FORM = {
  username:'', password:'', full_name:'', email:'', phone:'', nic:'',
  address_line1:'', address_line2:'', city:'', postal_code:'', country:'Sri Lanka',
  db_url:'', db_anon_key:'', db_label:'', db_code:'',
}

const EMPTY_EDIT = {
  username:'', full_name:'', email:'', phone:'', nic:'',
  address_line1:'', address_line2:'', city:'', postal_code:'', country:'Sri Lanka',
  db_url:'', db_anon_key:'', db_label:'', db_code:'', conn_id:null,
}

export default function AdminLandlords() {
  const [landlords, setLandlords]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [search, setSearch]           = useState('')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')
  const [successMsg, setSuccessMsg]   = useState('')
  const [form, setForm]       = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => { fetchLandlords() }, [])

  // ── Live DB connection test ──
  async function testConnection(url, key) {
    setTestResult(null)
    if (!url || !key) { setTestResult({ ok:false, msg:'Enter both URL and Anon Key first.' }); return }
    setTesting(true)
    try {
      const client = createClient(url.trim(), key.trim(), { auth:{ persistSession:false } })
      const { error } = await client.from('profiles').select('id').limit(1)
      if (error && error.code !== 'PGRST116') {
        setTestResult({ ok:false, msg:`Failed: ${error.message}` })
      } else {
        setTestResult({ ok:true, msg:'Connection successful! Database reachable.' })
      }
    } catch (e) {
      setTestResult({ ok:false, msg:`Error: ${e.message}` })
    }
    setTesting(false)
  }

  async function fetchLandlords() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'landlord')
      .order('created_at', { ascending: false })
    setLandlords(data || [])
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setErr(''); setSuccessMsg(''); setTestResult(null); setModal('create')
  }

  async function openEdit(landlord) {
    setEditTarget(landlord)
    setErr(''); setTestResult(null)
    setEditForm({
      username:      landlord.username      || '',
      full_name:     landlord.full_name     || '',
      email:         landlord.email         || '',
      phone:         landlord.phone         || '',
      nic:           landlord.nic           || '',
      address_line1: landlord.address_line1 || '',
      address_line2: landlord.address_line2 || '',
      city:          landlord.city          || '',
      postal_code:   landlord.postal_code   || '',
      country:       landlord.country       || 'Sri Lanka',
      db_url:'', db_anon_key:'', db_label:'', conn_id:null,
    })
    setModal('edit')

    // Load existing DB connection for this landlord, if any
    const { data: conn } = await supabase
      .from('tenant_connections')
      .select('*')
      .eq('landlord_id', landlord.id)
      .maybeSingle()
    if (conn) {
      setEditForm(x => ({
        ...x,
        db_url:      conn.db_url      || '',
        db_anon_key: conn.db_anon_key || '',
        db_label:    conn.db_label    || '',
        db_code:     conn.landlord_code || '',
        conn_id:     conn.id,
      }))
    }
  }

  async function createLandlord() {
    if (!form.username)   { setErr('Username is required.'); return }
    if (!form.password)   { setErr('Temporary password is required.'); return }
    if (!form.full_name)  { setErr('Full name is required.'); return }
    if (!form.phone)      { setErr('Contact number is required.'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters.'); return }

    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      const result = await createUser({
        username:  form.username,
        password:  form.password,
        fullName:  form.full_name,
        email:     form.email,
        phone:     form.phone,
        nic:       form.nic,
        role:      'landlord',
        address:   [form.address_line1, form.address_line2].filter(Boolean).join(', '),
      })

      // Save extended address fields
      if (result?.userId) {
        await supabase.from('profiles').update({
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city:          form.city          || null,
          postal_code:   form.postal_code   || null,
          country:       form.country       || 'Sri Lanka',
        }).eq('id', result.userId)

        // Save DB connection if provided
        if (form.db_url && form.db_anon_key) {
          await supabase.from('tenant_connections').insert({
            landlord_id:   result.userId,
            db_url:        form.db_url.trim(),
            db_anon_key:   form.db_anon_key.trim(),
            db_label:      form.db_label.trim() || null,
            landlord_code: form.db_code.trim().toUpperCase() || null,
            is_active:     true,
          })
        }
      }

      setSuccessMsg(`✓ Landlord account created! Username: ${form.username}`)
      setForm(EMPTY_FORM)
      fetchLandlords()
    } catch (e) {
      setErr(e.message || 'Failed to create landlord.')
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editForm.full_name) { setErr('Full name is required.'); return }
    if (!editForm.phone)     { setErr('Contact number is required.'); return }
    setSaving(true); setErr('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username:      editForm.username.trim()      || null,
          full_name:     editForm.full_name.trim(),
          email:         editForm.email.trim()         || null,
          phone:         editForm.phone.trim()         || null,
          nic:           editForm.nic.trim()           || null,
          address_line1: editForm.address_line1.trim() || null,
          address_line2: editForm.address_line2.trim() || null,
          city:          editForm.city.trim()          || null,
          postal_code:   editForm.postal_code.trim()   || null,
          country:       editForm.country.trim()       || 'Sri Lanka',
        })
        .eq('id', editTarget.id)
      if (error) throw new Error(error.message)

      // Upsert / remove DB connection
      const hasConn = editForm.db_url && editForm.db_anon_key
      if (hasConn) {
        const payload = {
          landlord_id:   editTarget.id,
          db_url:        editForm.db_url.trim(),
          db_anon_key:   editForm.db_anon_key.trim(),
          db_label:      editForm.db_label.trim() || null,
          landlord_code: editForm.db_code.trim().toUpperCase() || null,
          is_active:     true,
        }
        if (editForm.conn_id) {
          await supabase.from('tenant_connections').update(payload).eq('id', editForm.conn_id)
        } else {
          await supabase.from('tenant_connections').insert(payload)
        }
        evictDbCache(editTarget.id)
      } else if (editForm.conn_id) {
        // Connection fields cleared → remove the connection record
        await supabase.from('tenant_connections').delete().eq('id', editForm.conn_id)
        evictDbCache(editTarget.id)
      }

      setModal(false)
      fetchLandlords()
    } catch (e) {
      setErr(e.message || 'Failed to update landlord.')
    }
    setSaving(false)
  }

  async function toggleActive(landlord) {
    const action = landlord.is_active ? 'Suspend' : 'Activate'
    if (!confirm(`${action} ${landlord.full_name}?`)) return
    await supabase.from('profiles').update({ is_active: !landlord.is_active }).eq('id', landlord.id)
    fetchLandlords()
  }

  const set  = f => e => setForm(x => ({ ...x, [f]: e.target.value }))
  const setE = f => e => setEditForm(x => ({ ...x, [f]: e.target.value }))

  const filtered = landlords.filter(l =>
    !search ||
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.username?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Section divider helper ──
  function SectionLabel({ text }) {
    return (
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', margin:'1rem 0 0.5rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)' }}>
        {text}
      </div>
    )
  }

  // ── Reusable form fields ──
  function CreateFields() {
    return (
      <>
        <SectionLabel text="Login Credentials" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Username *" value={form.username} onChange={set('username')} placeholder="e.g. suresh123" hint="Used to log in — must be unique" />
          <Input label="Temp Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" hint="Landlord changes this on first login" />
        </div>

        <SectionLabel text="Personal Information" />
        <Input label="Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Suresh Perera" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Contact Number *" value={form.phone} onChange={set('phone')} placeholder="e.g. 0771234567" />
          <Input label="NIC / Passport" value={form.nic} onChange={set('nic')} placeholder="National ID or Passport" />
        </div>
        <Input label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="landlord@example.com (optional)" />

        <SectionLabel text="Address" />
        <Input label="Address Line 1" value={form.address_line1} onChange={set('address_line1')} placeholder="Street address" />
        <Input label="Address Line 2" value={form.address_line2} onChange={set('address_line2')} placeholder="Apartment, suite, floor (optional)" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="City" value={form.city} onChange={set('city')} placeholder="e.g. Colombo" />
          <Input label="Postal Code" value={form.postal_code} onChange={set('postal_code')} placeholder="e.g. 10100" />
        </div>
        <Input label="Country" value={form.country} onChange={set('country')} placeholder="Sri Lanka" />

        <SectionLabel text="Database Connection (optional)" />
        <ConnHint />
        <Input label="Landlord Code" value={form.db_code} onChange={e => setForm(x => ({ ...x, db_code: e.target.value.toUpperCase() }))} placeholder="e.g. PERERA01" hint="Tenants enter this code to log in" />
        <Input label="Connection Label" value={form.db_label} onChange={set('db_label')} placeholder="e.g. Perera Properties Server" />
        <Input label="Supabase Project URL" value={form.db_url} onChange={set('db_url')} placeholder="https://xxxx.supabase.co" />
        <ConnKeyField value={form.db_anon_key} onChange={set('db_anon_key')} />
        <ConnTest url={form.db_url} keyVal={form.db_anon_key} />
      </>
    )
  }

  // ── Shared connection UI bits ──
  function ConnHint() {
    return (
      <div style={{ background:'var(--blue-bg)', border:'1px solid #BFDBFE', borderRadius:'var(--radius)', padding:'9px 12px', marginBottom:10, fontSize:12, color:'var(--blue-text)' }}>
        Leave blank to use the shared master database. Enter the landlord's own Supabase project to isolate their tenants & data. Use the <strong>anon</strong> key only — never the service_role key.
      </div>
    )
  }
  function ConnKeyField({ value, onChange }) {
    return (
      <div style={{ marginBottom:10 }}>
        <label style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:6 }}>Anon Key</label>
        <textarea value={value} onChange={onChange} rows={3}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--radius)', border:'1px solid var(--border)', fontSize:12, fontFamily:'monospace', resize:'vertical', background:'var(--surface)', color:'var(--text)', lineHeight:1.5 }} />
      </div>
    )
  }
  function ConnTest({ url, keyVal }) {
    return (
      <div style={{ marginBottom:6 }}>
        <Button size="sm" variant="secondary" type="button" loading={testing} onClick={() => testConnection(url, keyVal)}>🔌 Test Connection</Button>
        {testResult && (
          <div style={{ marginTop:8, background: testResult.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: testResult.ok ? 'var(--green-text)' : 'var(--red-text)', padding:'8px 12px', borderRadius:'var(--radius)', fontSize:13 }}>
            {testResult.ok ? '✓' : '✗'} {testResult.msg}
          </div>
        )}
      </div>
    )
  }

  function EditFields() {
    return (
      <>
        <SectionLabel text="Login Credentials" />
        <Input label="Username" value={editForm.username} onChange={setE('username')} placeholder="e.g. suresh123" hint="Changing this will affect their login" />

        <SectionLabel text="Personal Information" />
        <Input label="Full Name *" value={editForm.full_name} onChange={setE('full_name')} placeholder="e.g. Suresh Perera" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="Contact Number *" value={editForm.phone} onChange={setE('phone')} placeholder="e.g. 0771234567" />
          <Input label="NIC / Passport" value={editForm.nic} onChange={setE('nic')} placeholder="National ID or Passport" />
        </div>
        <Input label="Email Address" type="email" value={editForm.email} onChange={setE('email')} placeholder="landlord@example.com (optional)" />

        <SectionLabel text="Address" />
        <Input label="Address Line 1" value={editForm.address_line1} onChange={setE('address_line1')} placeholder="Street address" />
        <Input label="Address Line 2" value={editForm.address_line2} onChange={setE('address_line2')} placeholder="Apartment, suite, floor (optional)" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Input label="City" value={editForm.city} onChange={setE('city')} placeholder="e.g. Colombo" />
          <Input label="Postal Code" value={editForm.postal_code} onChange={setE('postal_code')} placeholder="e.g. 10100" />
        </div>
        <Input label="Country" value={editForm.country} onChange={setE('country')} placeholder="Sri Lanka" />

        <SectionLabel text="Database Connection (optional)" />
        <ConnHint />
        <Input label="Landlord Code" value={editForm.db_code} onChange={e => setEditForm(x => ({ ...x, db_code: e.target.value.toUpperCase() }))} placeholder="e.g. PERERA01" hint="Tenants enter this code to log in" />
        <Input label="Connection Label" value={editForm.db_label} onChange={setE('db_label')} placeholder="e.g. Perera Properties Server" />
        <Input label="Supabase Project URL" value={editForm.db_url} onChange={setE('db_url')} placeholder="https://xxxx.supabase.co" />
        <ConnKeyField value={editForm.db_anon_key} onChange={setE('db_anon_key')} />
        <ConnTest url={editForm.db_url} keyVal={editForm.db_anon_key} />
      </>
    )
  }

  return (
    <div>
      <PageHeader title="Landlords" sub="Manage all landlord accounts"
        action={<Button onClick={openAdd}>+ Create Landlord</Button>} />

      <div style={{ marginBottom:'1rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or username..."
          style={{ padding:'9px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, background:'var(--surface)', color:'var(--text)', width:'100%', maxWidth:400, outline:'none' }}
        />
      </div>

      <Table
        headers={['Name', 'Contact', 'NIC', 'City', 'Joined', 'Status', 'Actions']}
        empty={{ title:'No landlords yet', sub:'Create the first landlord account to get started.' }}>
        {filtered.map(l => (
          <Tr key={l.id}>
            <Td>
              <div style={{ fontWeight:500 }}>{l.full_name}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>@{l.username || '—'}</div>
            </Td>
            <Td>
              <div style={{ fontSize:13, color:'var(--text2)' }}>{l.phone || '—'}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{l.email || '—'}</div>
            </Td>
            <Td style={{ fontFamily:'monospace', fontSize:12, color:'var(--text2)' }}>{l.nic || '—'}</Td>
            <Td style={{ color:'var(--text2)', fontSize:13 }}>{l.city || '—'}</Td>
            <Td style={{ color:'var(--text2)' }}>{new Date(l.created_at).toLocaleDateString('en-LK')}</Td>
            <Td><Badge variant={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Suspended'}</Badge></Td>
            <Td>
              <div style={{ display:'flex', gap:6 }}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(l)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDetailModal(l)}>View</Button>
                <Button size="sm" variant={l.is_active ? 'danger' : 'success'} onClick={() => toggleActive(l)}>
                  {l.is_active ? 'Suspend' : 'Activate'}
                </Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>

      {/* Create Landlord Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(false)} title="Create Landlord Account" maxWidth={520}>
        {successMsg ? (
          <div>
            <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 14px', borderRadius:'var(--radius)', marginBottom:16 }}>{successMsg}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth onClick={() => { setSuccessMsg(''); setForm(EMPTY_FORM) }}>Create Another</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <CreateFields />
            {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', margin:'12px 0' }}>{err}</div>}
            <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
              <Button fullWidth loading={saving} onClick={createLandlord}>Create Account</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Edit Landlord Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(false)} title="Edit Landlord" maxWidth={520}>
        {editTarget && (
          <>
            <EditFields />
            {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', margin:'12px 0' }}>{err}</div>}
            <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
              <Button fullWidth loading={saving} onClick={saveEdit}>Save Changes</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Landlord Details" maxWidth={480}>
        {detailModal && (
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Personal Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1rem' }}>
              {[
                ['Full Name',    detailModal.full_name],
                ['Username',     detailModal.username     || '—'],
                ['Contact No.',  detailModal.phone        || '—'],
                ['Email',        detailModal.email        || '—'],
                ['NIC/Passport', detailModal.nic          || '—'],
                ['Status',       detailModal.is_active ? 'Active' : 'Suspended'],
                ['Member Since', new Date(detailModal.created_at).toLocaleDateString('en-LK')],
              ].map(([label, value]) => (
                <div key={label} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
                  <div style={{ fontWeight:500, fontSize:14 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Address</div>
            <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px', fontSize:14 }}>
              {[detailModal.address_line1, detailModal.address_line2, detailModal.city, detailModal.postal_code, detailModal.country]
                .filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
