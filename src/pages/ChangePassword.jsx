import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ChangePassword() {
  const { changePassword, profile, signOut } = useAuth()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await changePassword(form.password)
    } catch (err) {
      setError(err.message || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div className="fade-up" style={{ textAlign:'center', marginBottom:'2rem' }}>
          <h1 style={{ fontFamily:'Instrument Serif, serif', fontSize:'2.8rem', fontWeight:400, color:'var(--accent)' }}>Ceylora</h1>
          <p style={{ fontSize:14, color:'var(--text2)', marginTop:4 }}>Set Your Password</p>
        </div>

        <div className="fade-up fade-up-1" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem', boxShadow:'var(--shadow-md)' }}>
          <div style={{ background:'var(--amber-bg)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:'1.25rem', fontSize:13, color:'var(--amber-text)' }}>
            👋 Welcome, <strong>{profile?.full_name}</strong>! Please set your own password before continuing.
          </div>
          <form onSubmit={handleSubmit}>
            <Input
              label="New Password"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat your password"
              required
            />
            {error && (
              <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
                {error}
              </div>
            )}
            <Button type="submit" fullWidth loading={loading} size="lg">Set Password & Continue</Button>
          </form>
          <button onClick={signOut} style={{ width:'100%', marginTop:12, background:'none', border:'none', color:'var(--text3)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
