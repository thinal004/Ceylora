import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LangSwitch from '../../components/ui/LangSwitch'

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { to: '/admin',           label: 'Dashboard', icon: '▦', end: true },
    { to: '/admin/landlords', label: 'Landlords', icon: '🏢' },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'SA'

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <header style={{
        background:'#1a1a2e', color:'#fff',
        padding:'0 1rem', height:56, display:'flex',
        alignItems:'center', justifyContent:'space-between',
        flexShrink:0, position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger" style={{
            display:'none', background:'none', border:'none', color:'inherit',
            fontSize:20, cursor:'pointer', padding:'4px 8px', borderRadius:6,
          }}>☰</button>
          <span style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.4rem', letterSpacing:'-0.5px' }}>Ceylora</span>
          <span style={{ fontSize:11, opacity:0.5, fontWeight:500, letterSpacing:'1.5px', textTransform:'uppercase' }}>Super Admin</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LangSwitch />
          <span className="hide-mobile" style={{ fontSize:13, opacity:0.8 }}>{profile?.full_name}</span>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>{initials}</div>
          <button onClick={handleSignOut} style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'inherit', borderRadius:'var(--radius)', padding:'5px 12px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>Sign out</button>
        </div>
      </header>

      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} className="mobile-overlay" style={{
            display:'none', position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:98,
          }} />
        )}

        <nav className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} style={{
          width:220, flexShrink:0, background:'var(--surface)',
          borderRight:'1px solid var(--border)', padding:'1.25rem 0.75rem',
          display:'flex', flexDirection:'column', gap:2,
        }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:'var(--radius)',
                fontSize:14, fontWeight:500, textDecoration:'none',
                transition:'all 0.12s',
                background: isActive ? '#1a1a2e' : 'transparent',
                color: isActive ? '#fff' : 'var(--text2)',
              })}>
              <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div style={{ marginTop:16, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6, padding:'0 12px' }}>Coming Soon</div>
            {['Reports', 'Subscriptions', 'Audit Logs', 'Settings'].map(label => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:'var(--radius)', fontSize:13, color:'var(--text3)', cursor:'not-allowed' }}>
                <span style={{ fontSize:10, background:'var(--amber-bg)', color:'var(--amber)', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>SOON</span>
                {label}
              </div>
            ))}
          </div>
        </nav>

        <main style={{ flex:1, overflowY:'auto', padding:'1.5rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
