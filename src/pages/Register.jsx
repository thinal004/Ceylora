import { Navigate } from 'react-router-dom'

// Public registration is disabled.
// Landlords are created by Super Admin.
// Tenants are created by Landlords.
export default function Register() {
  return <Navigate to="/login" replace />
}
