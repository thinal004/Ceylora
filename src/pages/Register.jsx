import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input, Select } from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', role: 'landlord', phone: '', nic: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.fullName, form.role, form.phone, form.nic)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.8rem', fontWeight: 400, marginBottom: 12 }}>Check your email</h2>
        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.</p>
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Back to Login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '2.5rem', fontWeight: 400, color: 'var(--accent)' }}>Ceylora</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>Create your account</p>
        </div>
        <div className="fade-up fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit}>
            <Select label="I am a" value={form.role} onChange={set('role')}>
              <option value="landlord">🏠 Landlord / Property Owner</option>
              <option value="tenant">👤 Tenant</option>
            </Select>
            <Input label="Full Name" value={form.fullName} onChange={set('fullName')} placeholder="e.g. Suresh Perera" required />
            <Input label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            <Input label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="e.g. 0771234567" />
            <Input label="NIC Number" value={form.nic} onChange={set('nic')} placeholder="e.g. 199012345678" hint="National Identity Card — required for Sri Lanka tenancy agreements" />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
            <Input label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 13, padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>{error}</div>}
            <Button type="submit" fullWidth loading={loading} size="lg">Create Account</Button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', marginTop: '1.25rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
