import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { path: '/landlord',            label: 'Dashboard',   icon: '📊', exact: true },
  { path: '/landlord/properties', label: 'Properties',  icon: '🏢' },
  { path: '/landlord/tenants',    label: 'Tenants',     icon: '👥' },
  { path: '/landlord/payments',   label: 'Payments',    icon: '💰' },
  { path: '/landlord/settings',   label: 'Settings',    icon: '⚙️' },
]

export default function LandlordShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(item) {
    return item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path)
  }

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-name">Ceylora</span>
          <span className="brand-tag">Landlord</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user-name">{profile?.full_name}</span>
          <div className="avatar">{profile?.full_name?.[0]?.toUpperCase() || 'L'}</div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {/* Sidebar */}
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

      {/* Page content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
