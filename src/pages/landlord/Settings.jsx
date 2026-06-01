import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone     || '',
    nic:       profile?.nic       || '',
    address:   profile?.address   || '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [err, setErr]       = useState('')

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))

  async function save() {
    if (!form.full_name) { setErr('Full name is required.'); return }
    setSaving(true); setErr(''); setMsg('')
    try {
      await updateProfile(form)
      setMsg('✓ Profile updated successfully.')
    } catch (e) {
      setErr(e.message || 'Failed to save.')
    }
    setSaving(false)
  }

  return (
    <div>
      <PageHeader title="Settings" sub="Manage your profile information" />

      <div style={{ maxWidth: 560 }}>
        <Card>
          <h3 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.1rem', fontWeight:400, marginBottom:'1.25rem' }}>Profile Information</h3>
          <Input label="Full Name *" value={form.full_name} onChange={set('full_name')} />
          <Input label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="e.g. 0771234567" />
          <Input label="NIC / Passport Number" value={form.nic} onChange={set('nic')} placeholder="National ID or Passport" />
          <Input label="Address" value={form.address} onChange={set('address')} placeholder="Your address" />
          {msg && <div style={{ background:'var(--green-bg)', color:'var(--green-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{msg}</div>}
          {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
          <Button loading={saving} onClick={save}>Save Changes</Button>
        </Card>

        <Card style={{ marginTop:'1rem' }}>
          <h3 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.1rem', fontWeight:400, marginBottom:8 }}>Account</h3>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>Email: <strong>{profile?.email || 'Not available'}</strong></p>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Role: <strong>Landlord</strong></p>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:12 }}>To change your email or password, use the password reset link on the login page.</p>
        </Card>
      </div>
    </div>
  )
}
