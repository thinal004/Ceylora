import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { StatCard } from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import Table, { Tr, Td } from '../../components/ui/Table'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    try {
      // Fetch properties
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', profile.id)

      const propertyIds = (properties || []).map(p => p.id)

      if (propertyIds.length === 0) {
        setStats({ totalProperties: 0, totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, totalMonthlyRent: 0, collectedThisMonth: 0, outstandingRent: 0 })
        setRecentPayments([])
        setLoading(false)
        return
      }

      // Fetch units
      const { data: units } = await supabase
        .from('units')
        .select('id, monthly_rent, is_occupied')
        .in('property_id', propertyIds)

      const unitIds = (units || []).map(u => u.id)
      const totalUnits = units?.length || 0
      const occupiedUnits = units?.filter(u => u.is_occupied).length || 0
      const vacantUnits = totalUnits - occupiedUnits
      const totalMonthlyRent = units?.filter(u => u.is_occupied).reduce((s, u) => s + Number(u.monthly_rent), 0) || 0

      // Fetch active tenancies
      const { data: tenancies } = await supabase
        .from('tenancies')
        .select('id, monthly_rent')
        .in('unit_id', unitIds)
        .eq('is_active', true)

      const tenancyIds = (tenancies || []).map(t => t.id)

      // Fetch this month's payments
      let collectedThisMonth = 0
      let recentRows = []

      if (tenancyIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id, amount, paid_date, status, period_year, period_month, created_at,
            tenancies (
              id, monthly_rent,
              units ( unit_number, properties ( name ) ),
              profiles:tenant_id ( full_name )
            )
          `)
          .in('tenancy_id', tenancyIds)
          .eq('period_year', currentYear)
          .eq('period_month', currentMonth)
          .order('created_at', { ascending: false })

        const confirmedThisMonth = payments?.filter(p => p.status === 'confirmed') || []
        collectedThisMonth = confirmedThisMonth.reduce((s, p) => s + Number(p.amount), 0)

        // Recent payments (last 10, any status, any month)
        const { data: recent } = await supabase
          .from('payments')
          .select(`
            id, amount, paid_date, status, period_year, period_month, created_at,
            tenancies (
              units ( unit_number ),
              profiles:tenant_id ( full_name )
            )
          `)
          .in('tenancy_id', tenancyIds)
          .order('created_at', { ascending: false })
          .limit(10)

        recentRows = recent || []
      }

      // Outstanding = total monthly rent of active tenancies minus confirmed payments this month
      const totalActiveTenancyRent = tenancies?.reduce((s, t) => s + Number(t.monthly_rent), 0) || 0
      const outstandingRent = Math.max(0, totalActiveTenancyRent - collectedThisMonth)

      setStats({
        totalProperties: properties?.length || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        totalMonthlyRent,
        collectedThisMonth,
        outstandingRent,
      })
      setRecentPayments(recentRows)
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const dateStr = now.toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title={`Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${profile?.full_name?.split(' ')[0]}`}
        sub={dateStr}
      />

      {/* 7 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: '2rem' }}>
        <StatCard delay={1} label="Total Properties"     value={stats.totalProperties}                color="accent" />
        <StatCard delay={2} label="Total Units"          value={stats.totalUnits}                      />
        <StatCard delay={3} label="Occupied Units"       value={stats.occupiedUnits}                   color="green" />
        <StatCard delay={4} label="Vacant Units"         value={stats.vacantUnits}                     color={stats.vacantUnits > 0 ? 'amber' : 'green'} />
        <StatCard delay={5} label="Total Monthly Rent"   value={LKR(stats.totalMonthlyRent)}           color="gold"
          sub="from occupied units" />
        <StatCard delay={6} label="Collected This Month" value={LKR(stats.collectedThisMonth)}         color="green"
          sub={`${MONTHS[currentMonth - 1]} ${currentYear}`} />
        <StatCard delay={7} label="Outstanding Rent"     value={LKR(stats.outstandingRent)}            color={stats.outstandingRent > 0 ? 'red' : 'green'}
          sub={stats.outstandingRent > 0 ? 'Needs collection' : 'All collected ✓'} />
      </div>

      {/* Recent Payments */}
      <div className="fade-up fade-up-7">
        <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.3rem', fontWeight: 400, marginBottom: '1rem' }}>
          Recent Payments
        </h2>
        <Table
          headers={['Tenant Name', 'Unit', 'Period', 'Amount', 'Date', 'Status']}
          empty={{ title: 'No payments yet', sub: 'Payments will appear here once tenants submit or you mark them.' }}>
          {recentPayments.length > 0 && recentPayments.map(p => {
            const tenantName = p.tenancies?.profiles?.full_name || '—'
            const unitName = p.tenancies?.units?.unit_number || '—'
            const period = `${MONTHS[p.period_month - 1]} ${p.period_year}`
            const badgeVariant = p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
            const badgeLabel = p.status === 'confirmed' ? '✓ Confirmed' : p.status === 'pending' ? '⏳ Pending' : 'Overdue'
            return (
              <Tr key={p.id}>
                <Td><strong>{tenantName}</strong></Td>
                <Td>{unitName}</Td>
                <Td style={{ color: 'var(--text2)' }}>{period}</Td>
                <Td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{LKR(p.amount)}</span></Td>
                <Td style={{ color: 'var(--text2)' }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-LK') : '—'}</Td>
                <Td><Badge variant={badgeVariant}>{badgeLabel}</Badge></Td>
              </Tr>
            )
          })}
        </Table>
      </div>
    </div>
  )
}
