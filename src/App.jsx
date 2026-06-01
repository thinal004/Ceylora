import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import LandlordLayout from './pages/landlord/LandlordLayout'
import Dashboard from './pages/landlord/Dashboard'
import Properties from './pages/landlord/Properties'
import Tenants from './pages/landlord/Tenants'
import Payments from './pages/landlord/Payments'
import Settings from './pages/landlord/Settings'
import TenantLayout from './pages/tenant/TenantLayout'
import TenantOverview from './pages/tenant/TenantOverview'
import TenantHistory from './pages/tenant/TenantHistory'

function PrivateRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'landlord' ? '/landlord' : '/tenant'} replace />
  }
  return children
}

function FullScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading Ceylora...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return <FullScreenLoader />

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={profile?.role === 'landlord' ? '/landlord' : '/tenant'} replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={profile?.role === 'landlord' ? '/landlord' : '/tenant'} replace />} />

      <Route path="/landlord" element={<PrivateRoute role="landlord"><LandlordLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="payments" element={<Payments />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/tenant" element={<PrivateRoute role="tenant"><TenantLayout /></PrivateRoute>}>
        <Route index element={<TenantOverview />} />
        <Route path="history" element={<TenantHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
