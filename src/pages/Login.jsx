import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { user } = await signIn(email, password)
      // profile role check handled by App.jsx routing
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Welcome to</div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '2.8rem', fontWeight: 400, color: 'var(--accent)', letterSpacing: '-1px', lineHeight: 1 }}>Ceylora</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>Tenant Management System</p>
        </div>

        {/* Form */}
        <div className="fade-up fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.2rem', fontFamily: 'Instrument Serif, serif', fontWeight: 400, marginBottom: '1.5rem' }}>Sign in to your account</h2>
          <form onSubmit={handleSubmit}>
            <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red-text)', fontSize: 13, padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>{error}</div>}
            <Button type="submit" fullWidth loading={loading} size="lg">Sign In</Button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', marginTop: '1.25rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Register</Link>
          </p>
        </div>

        <p className="fade-up fade-up-2" style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: '1.5rem' }}>
          © {new Date().getFullYear()} Ceylora — Sri Lanka
        </p>
      </div>
    </div>
  )
}
