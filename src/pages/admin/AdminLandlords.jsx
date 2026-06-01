import { useEffect, useState } from 'react'
import { supabase, createUser } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

export default function AdminLandlords() {
  const [landlords, setLandlords] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({ username:'', password:'', full_name:'', email:'', phone:'', nic:'' })

  useEffect(() => { fetchLandlords() }, [])

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
    setForm({ username:'', password:'', full_name:'', email:'', phone:'', nic:'' })
    setErr(''); setSuccessMsg(''); setModal(true)
  }

  async function createLandlord() {
    if (!form.username || !form.password || !form.full_name) { setErr('Username, password and full name are required.'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      await createUser({
        username: form.username,
        password: form.password,
        fullName: form.full_name,
        email: form.email,
        phone: form.phone,
        nic: form.nic,
        role: 'landlord',
      })
      setSuccessMsg(`✓ Landlord account created! Username: ${form.username}`)
      setForm({ username:'', password:'', full_name:'', email:'', phone:'', nic:'' })
      fetchLandlords()
    } catch (e) {
      setErr(e.message || 'Failed to create landlord.')
    }
    setSaving(false)
  }

  async function toggleActive(landlord) {
    const action = landlord.is_active ? 'suspend' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${landlord.full_name}?`)) return
    await supabase.from('profiles').update({ is_active: !landlord.is_active }).eq('id', landlord.id)
    fetchLandlords()
  }

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))

  const filtered = landlords.filter(l =>
    !search || l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Landlords" sub="Manage all landlord accounts"
        action={<Button onClick={openAdd}>+ Create Landlord</Button>} />

      <div style={{ marginBottom:'1rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ padding:'9px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, background:'var(--surface)', color:'var(--text)', width:'100%', maxWidth:360, outline:'none' }}
        />
      </div>

      <Table
        headers={['Name', 'Email', 'Phone', 'NIC', 'Joined', 'Status', 'Actions']}
        empty={{ title:'No landlords yet', sub:'Create the first landlord account to get started.' }}>
        {filtered.map((l, i) => (
          <Tr key={l.id}>
            <Td>
              <div style={{ fontWeight:500 }}>{l.full_name}</div>
            </Td>
            <Td style={{ color:'var(--text2)', fontSize:13 }}>{l.email || '—'}</Td>
            <Td style={{ color:'var(--text2)' }}>{l.phone || '—'}</Td>
            <Td style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--text2)' }}>{l.nic || '—'}</Td>
            <Td style={{ color:'var(--text2)' }}>{new Date(l.created_at).toLocaleDateString('en-LK')}</Td>
            <Td><Badge variant={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Suspended'}</Badge></Td>
            <Td>
              <div style={{ display:'flex', gap:6 }}>
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
      <Modal open={modal} onClose={() => setModal(false)} title="Create Landlord Account" maxWidth={480}>
        <div style={{ background:'var(--blue-bg)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:'1rem', fontSize:13, color:'var(--blue-text)' }}>
          ℹ️ A password setup email will be automatically sent to the landlord once the account is created.
        </div>
        {successMsg ? (
          <div>
            <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'12px 14px', borderRadius:'var(--radius)', marginBottom:16 }}>{successMsg}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth onClick={() => { setSuccessMsg(''); }}>Create Another</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <Input label="Username *" value={form.username} onChange={set('username')} placeholder="e.g. suresh123" hint="Used to log in" />
              <Input label="Temp Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" hint="They'll change this on first login" />
            </div>
            <Input label="Full Name *"    value={form.full_name} onChange={set('full_name')} placeholder="e.g. Suresh Perera" />
            <Input label="Email (optional)" type="email" value={form.email} onChange={set('email')} placeholder="landlord@example.com" />
            <Input label="Phone Number"   value={form.phone} onChange={set('phone')} placeholder="e.g. 0771234567" />
            <Input label="NIC / Passport" value={form.nic} onChange={set('nic')} placeholder="National ID or Passport number" />
            {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Button fullWidth loading={saving} onClick={createLandlord}>Create Account</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Landlord Details">
        {detailModal && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['Full Name', detailModal.full_name],
              ['Email', detailModal.email || '—'],
              ['Phone', detailModal.phone || '—'],
              ['NIC / Passport', detailModal.nic || '—'],
              ['Status', detailModal.is_active ? 'Active' : 'Suspended'],
              ['Member Since', new Date(detailModal.created_at).toLocaleDateString('en-LK')],
            ].map(([label, value]) => (
              <div key={label} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
                <div style={{ fontWeight:500, fontSize:14 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
