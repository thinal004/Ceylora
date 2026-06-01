import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function Settings() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '', nic: profile?.nic || '' })
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))
  const setP = f => e => setPassForm(x => ({ ...x, [f]: e.target.value }))

  async function saveProfile() {
    setSaving(true); setProfileMsg('')
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone, nic: form.nic }).eq('id', profile.id)
    setProfileMsg(error ? '❌ ' + error.message : '✅ Profile updated.')
    if (!error) refreshProfile()
    setSaving(false)
  }

  async function changePassword() {
    setPassMsg('')
    if (passForm.newPass !== passForm.confirm) { setPassMsg('❌ Passwords do not match.'); return }
    if (passForm.newPass.length < 6) { setPassMsg('❌ Minimum 6 characters.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passForm.newPass })
    setPassMsg(error ? '❌ ' + error.message : '✅ Password updated.')
    if (!error) setPassForm({ current: '', newPass: '', confirm: '' })
    setSaving(false)
  }

  return (
    <div>
      <PageHeader title="Settings" />
      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 520 }}>
        <Card>
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Profile Information</h3>
          <Input label="Full Name" value={form.full_name} onChange={set('full_name')} />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="0771234567" />
          <Input label="NIC Number" value={form.nic} onChange={set('nic')} placeholder="Sri Lanka NIC" />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: '1rem' }}>Email: {profile?.id} (cannot be changed here)</div>
          {profileMsg && <p style={{ fontSize: 13, marginBottom: 12, color: profileMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{profileMsg}</p>}
          <Button loading={saving} onClick={saveProfile}>Save Profile</Button>
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Change Password</h3>
          <Input label="New Password" type="password" value={passForm.newPass} onChange={setP('newPass')} placeholder="Min. 6 characters" />
          <Input label="Confirm New Password" type="password" value={passForm.confirm} onChange={setP('confirm')} />
          {passMsg && <p style={{ fontSize: 13, marginBottom: 12, color: passMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{passMsg}</p>}
          <Button loading={saving} onClick={changePassword}>Update Password</Button>
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: '1.1rem', marginBottom: '0.75rem' }}>About Ceylora</h3>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
            Ceylora is a cloud-based tenant management system built for Sri Lankan landlords. Data is stored securely on Supabase servers. Tenant agreements and payment records comply with Sri Lanka's <em>Rent Act No. 7 of 1972</em> and subsequent amendments.
          </p>
          <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text3)' }}>
            Version 1.0.0 · Made in Sri Lanka 🇱🇰
          </div>
        </Card>
      </div>
    </div>
  )
}
