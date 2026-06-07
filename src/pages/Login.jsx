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
  const [landlordCode, setLandlordCode] = useState('')
  const [isTenant, setIsTenant] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithUsername(username.trim(), password, isTenant ? landlordCode.trim() : '')
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
          {/* Tenant / staff toggle */}
          <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', background:'var(--surface2)', padding:4, borderRadius:'var(--radius)' }}>
            <button type="button" onClick={() => setIsTenant(false)} style={{
              flex:1, padding:'7px 0', border:'none', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500,
              background: !isTenant ? 'var(--surface)' : 'transparent', color: !isTenant ? 'var(--accent)' : 'var(--text2)',
              boxShadow: !isTenant ? 'var(--shadow)' : 'none',
            }}>Admin / Landlord</button>
            <button type="button" onClick={() => setIsTenant(true)} style={{
              flex:1, padding:'7px 0', border:'none', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500,
              background: isTenant ? 'var(--surface)' : 'transparent', color: isTenant ? 'var(--accent)' : 'var(--text2)',
              boxShadow: isTenant ? 'var(--shadow)' : 'none',
            }}>Tenant</button>
          </div>

          <form onSubmit={handleSubmit}>
            {isTenant && (
              <Input
                label="Landlord Code"
                type="text"
                value={landlordCode}
                onChange={e => setLandlordCode(e.target.value.toUpperCase())}
                placeholder="e.g. PERERA01"
                required
                autoComplete="off"
              />
            )}
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
