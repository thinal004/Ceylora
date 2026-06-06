import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LangContext'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'

export default function Login() {
  const { signInWithUsername } = useAuth()
  const { t } = useLang()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithUsername(username.trim(), password)
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div className="fade-up" style={{ textAlign:'center', marginBottom:'2rem' }}>
          <h1 style={{ fontFamily:'Instrument Serif, serif', fontSize:'2.8rem', fontWeight:400, color:'var(--accent)', letterSpacing:'-0.5px' }}>Ceylora</h1>
          <p style={{ fontSize:14, color:'var(--text2)', marginTop:4 }}>Rent Management System</p>
          <div style={{ display:'flex', justifyContent:'center', marginTop:12 }}>
            <div style={{ background:'var(--accent)', borderRadius:'var(--radius)', padding:4 }}>
              <LangSwitch />
            </div>
          </div>
        </div>

        <div className="fade-up fade-up-1 login-card" style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'2rem', boxShadow:'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit}>
            <Input
              label={t('username')}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('username')}
              required
              autoComplete="username"
            />
            <Input
              label={t('password')}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('password')}
              required
              autoComplete="current-password"
            />
            {error && (
              <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:'1rem' }}>
                {error}
              </div>
            )}
            <Button type="submit" fullWidth loading={loading} size="lg">{t('loginBtn')}</Button>
          </form>
          <p style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:'1.5rem' }}>
            {t('loginHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
