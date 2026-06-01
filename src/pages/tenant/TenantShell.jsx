import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { path: '/tenant',         label: 'My Unit',  icon: '🏠', exact: true },
  { path: '/tenant/history', label: 'History',  icon: '📋' },
]

export default function TenantShell() {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  function isActive(item) {
    return item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-name">Ceylora</span>
          <span className="brand-tag">Tenant</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user-name">{profile?.full_name}</span>
          <div className="avatar">{profile?.full_name?.[0]?.toUpperCase() || 'T'}</div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="sidebar">
        <span className="nav-section-label">Menu</span>
        {NAV.map(item => (
          <button
            key={item.path}
            className={`nav-item${isActive(item) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
