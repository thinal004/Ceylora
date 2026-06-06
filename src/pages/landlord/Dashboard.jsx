import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, LKR, MONTHS } from '../../lib/supabase'
import { calcOutstanding } from '../../lib/outstanding'
import { StatCard } from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import Table, { Tr, Td } from '../../components/ui/Table'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats]               = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [outstandingList, setOutstandingList] = useState([])
  const [loading, setLoading]           = useState(true)

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    try {
      // 1. Properties
      const { data: properties } = await supabase
        .from('properties').select('id').eq('landlord_id', profile.id)
      const propertyIds = (properties || []).map(p => p.id)

      if (!propertyIds.length) {
        setStats({ totalProperties:0, totalUnits:0, occupiedUnits:0, vacantUnits:0, totalMonthlyRent:0, collectedThisMonth:0, totalOutstanding:0 })
        setLoading(false); return
      }

      // 2. Units
      const { data: units } = await supabase
        .from('units')
        .select('id, monthly_rent, electricity_charges, water_charges, is_occupied, property_id')
        .in('property_id', propertyIds)
      const unitIds = (units || []).map(u => u.id)

      // 3. Active tenancies
      const { data: tenancies } = await supabase
        .from('tenancies')
        .select('id, monthly_rent, start_date, rent_due_day, unit_id, tenant_id, profiles:tenant_id(full_name), units(unit_number, electricity_charges, water_charges)')
        .in('unit_id', unitIds)
        .eq('is_active', true)
      const tenancyIds = (tenancies || []).map(t => t.id)

      // 4. All payments for these tenancies
      const { data: allPayments } = tenancyIds.length
        ? await supabase.from('payments').select('id, tenancy_id, amount, status, period_year, period_month, paid_date, payment_method, created_at, tenancies(units(unit_number), profiles:tenant_id(full_name))').in('tenancy_id', tenancyIds).order('created_at', { ascending: false })
        : { data: [] }

      // 5. Stats
      const totalUnits    = units?.length || 0
      const occupiedUnits = units?.filter(u => u.is_occupied).length || 0
      const totalMonthlyRent = (tenancies || []).reduce((s, t) => {
        const u = units?.find(u => u.id === t.unit_id)
        return s + parseFloat(t.monthly_rent || 0) + parseFloat(u?.electricity_charges || 0) + parseFloat(u?.water_charges || 0)
      }, 0)

      const collectedThisMonth = (allPayments || [])
        .filter(p => p.status === 'confirmed' && p.period_year === currentYear && p.period_month === currentMonth)
        .reduce((s, p) => s + parseFloat(p.amount || 0), 0)

      // 6. Outstanding per tenancy
      const outstandingRows = (tenancies || []).map(t => {
        const unit     = units?.find(u => u.id === t.unit_id)
        const payments = (allPayments || []).filter(p => p.tenancy_id === t.id)
        const amount   = calcOutstanding(t, unit, payments)
        return {
          tenantName: t.profiles?.full_name || '—',
          unitNumber: t.units?.unit_number  || '—',
          amount,
        }
      }).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount)

      const totalOutstanding = outstandingRows.reduce((s, r) => s + r.amount, 0)

      setStats({ totalProperties: propertyIds.length, totalUnits, occupiedUnits, vacantUnits: totalUnits - occupiedUnits, totalMonthlyRent, collectedThisMonth, totalOutstanding })
      setOutstandingList(outstandingRows)
      setRecentPayments((allPayments || []).slice(0, 10))
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const dateStr = now.toLocaleDateString('en-LK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title={`Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${profile?.full_name?.split(' ')[0]}`}
        sub={dateStr}
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:'2rem' }}>
        <StatCard delay={1} label="Properties"        value={stats.totalProperties}              color="accent" />
        <StatCard delay={2} label="Total Units"        value={stats.totalUnits} />
        <StatCard delay={3} label="Occupied"           value={stats.occupiedUnits}                color="green" />
        <StatCard delay={4} label="Vacant"             value={stats.vacantUnits}                  color={stats.vacantUnits > 0 ? 'amber' : 'green'} />
        <StatCard delay={5} label="Monthly Rent"       value={LKR(stats.totalMonthlyRent)}        color="gold"  sub="from occupied units" />
        <StatCard delay={6} label="Collected"          value={LKR(stats.collectedThisMonth)}      color="green" sub={`${MONTHS[currentMonth-1]} ${currentYear}`} />
        <StatCard delay={7} label="Total Outstanding"  value={LKR(stats.totalOutstanding)}        color={stats.totalOutstanding > 0 ? 'red' : 'green'} sub={stats.totalOutstanding > 0 ? 'Needs collection' : 'All clear ✓'} />
      </div>

      {/* Outstanding Balances */}
      {outstandingList.length > 0 && (
        <div className="fade-up fade-up-7" style={{ marginBottom:'2rem' }}>
          <h2 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.3rem', fontWeight:400, marginBottom:'1rem', color:'var(--red-text)' }}>
            ⚠ Outstanding Balances
          </h2>
          <Table headers={['Tenant', 'Unit', 'Outstanding Amount']}
            empty={{ title:'No outstanding balances', sub:'' }}>
            {outstandingList.map((r, i) => (
              <Tr key={i}>
                <Td><strong>{r.tenantName}</strong></Td>
                <Td style={{ color:'var(--text2)' }}>{r.unitNumber}</Td>
                <Td><span style={{ fontFamily:'monospace', fontSize:13, color:'var(--red-text)', fontWeight:600 }}>{LKR(r.amount)}</span></Td>
              </Tr>
            ))}
          </Table>
        </div>
      )}

      {/* Recent Payments */}
      <div className="fade-up fade-up-7">
        <h2 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.3rem', fontWeight:400, marginBottom:'1rem' }}>
          Recent Payments
        </h2>
        <Table headers={['Tenant', 'Unit', 'Period', 'Amount', 'Date', 'Status']}
          empty={{ title:'No payments yet', sub:'Payments appear here once tenants submit or you mark them.' }}>
          {recentPayments.map(p => {
            const badgeV = p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
            const badgeL = p.status === 'confirmed' ? '✓ Confirmed' : p.status === 'pending' ? '⏳ Pending' : 'Overdue'
            return (
              <Tr key={p.id}>
                <Td><strong>{p.tenancies?.profiles?.full_name || '—'}</strong></Td>
                <Td>{p.tenancies?.units?.unit_number || '—'}</Td>
                <Td style={{ color:'var(--text2)' }}>{MONTHS[p.period_month-1]} {p.period_year}</Td>
                <Td><span style={{ fontFamily:'monospace', fontSize:13 }}>{LKR(p.amount)}</span></Td>
                <Td style={{ color:'var(--text2)' }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-LK') : '—'}</Td>
                <Td><Badge variant={badgeV}>{badgeL}</Badge></Td>
              </Tr>
            )
          })}
        </Table>
      </div>
    </div>
  )
}
