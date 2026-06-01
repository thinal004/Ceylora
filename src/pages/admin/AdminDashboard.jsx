import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { StatCard } from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats]   = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    try {
      const [
        { data: landlords },
        { data: properties },
        { data: units },
        { data: tenancies },
        { data: recentLandlords },
      ] = await Promise.all([
        supabase.from('profiles').select('id, is_active').eq('role', 'landlord'),
        supabase.from('properties').select('id'),
        supabase.from('units').select('id, is_occupied'),
        supabase.from('tenancies').select('id').eq('is_active', true),
        supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at').eq('role', 'landlord').order('created_at', { ascending: false }).limit(10),
      ])

      setStats({
        totalLandlords:  landlords?.length || 0,
        activeLandlords: landlords?.filter(l => l.is_active).length || 0,
        totalProperties: properties?.length || 0,
        totalUnits:      units?.length || 0,
        occupiedUnits:   units?.filter(u => u.is_occupied).length || 0,
        totalTenants:    tenancies?.length || 0,
      })
      setRecent(recentLandlords || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const greeting = `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${profile?.full_name?.split(' ')[0]}`

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title={greeting}
        sub={now.toLocaleDateString('en-LK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:'2rem' }}>
        <StatCard delay={1} label="Total Landlords"   value={stats.totalLandlords}   color="accent" />
        <StatCard delay={2} label="Active Landlords"  value={stats.activeLandlords}  color="green" />
        <StatCard delay={3} label="Total Properties"  value={stats.totalProperties}  />
        <StatCard delay={4} label="Total Units"       value={stats.totalUnits}        />
        <StatCard delay={5} label="Occupied Units"    value={stats.occupiedUnits}    color="green" />
        <StatCard delay={6} label="Active Tenancies"  value={stats.totalTenants}     color="gold" />
      </div>

      <div className="fade-up fade-up-6">
        <h2 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.3rem', fontWeight:400, marginBottom:'1rem' }}>Recent Landlords</h2>
        <Table
          headers={['Name', 'Email', 'Phone', 'Joined', 'Status']}
          empty={{ title:'No landlords yet', sub:'Create landlord accounts from the Landlords page.' }}>
          {recent.map(l => (
            <Tr key={l.id}>
              <Td><strong>{l.full_name}</strong></Td>
              <Td style={{ color:'var(--text2)' }}>{l.email || '—'}</Td>
              <Td style={{ color:'var(--text2)' }}>{l.phone || '—'}</Td>
              <Td style={{ color:'var(--text2)' }}>{new Date(l.created_at).toLocaleDateString('en-LK')}</Td>
              <Td><Badge variant={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Suspended'}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </div>
    </div>
  )
}
