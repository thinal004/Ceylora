import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, LKR, MONTHS } from '../../lib/supabase'
import { calcOutstanding } from '../../lib/outstanding'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

const PAYMENT_METHODS = ['Bank Transfer','Cash','Cheque','Online Transfer','Other']

export default function Payments() {
  const { profile } = useAuth()
  const [payments, setPayments]         = useState([])
  const [tenancies, setTenancies]       = useState([])
  const [units, setUnits]               = useState([])
  const [outstandingList, setOutstandingList] = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState('all') // 'all' | 'outstanding'
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTenancy, setFilterTenancy] = useState('')
  const [markModal, setMarkModal]       = useState(null)
  const [receiptModal, setReceiptModal] = useState(null)
  const [form, setForm] = useState({ amount:'', paid_date:'', payment_method:'Bank Transfer', note:'' })
  const [saving, setSaving]             = useState(false)
  const now = new Date()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', profile.id)
    const pIds = (props || []).map(p => p.id)
    if (!pIds.length) { setLoading(false); return }

    const { data: fetchedUnits } = await supabase
      .from('units')
      .select('id, monthly_rent, electricity_charges, water_charges, unit_number, property_id')
      .in('property_id', pIds)
    const uIds = (fetchedUnits || []).map(u => u.id)
    setUnits(fetchedUnits || [])

    const { data: ten } = await supabase
      .from('tenancies')
      .select('id, monthly_rent, start_date, rent_due_day, unit_id, units(unit_number, electricity_charges, water_charges, properties(name)), profiles:tenant_id(full_name)')
      .in('unit_id', uIds)
      .eq('is_active', true)
    setTenancies(ten || [])

    const tenIds = (ten || []).map(t => t.id)
    if (!tenIds.length) { setLoading(false); return }

    const { data: pays } = await supabase
      .from('payments')
      .select('*, tenancies(monthly_rent, unit_id, units(unit_number, properties(name)), profiles:tenant_id(full_name))')
      .in('tenancy_id', tenIds)
      .order('created_at', { ascending: false })
    setPayments(pays || [])

    // Calculate outstanding per tenancy
    const outstanding = (ten || []).map(t => {
      const unit     = (fetchedUnits || []).find(u => u.id === t.unit_id)
      const tPays    = (pays || []).filter(p => p.tenancy_id === t.id)
      const amount   = calcOutstanding(t, unit, tPays)
      const monthlyRent = parseFloat(t.monthly_rent || 0)
        + parseFloat(unit?.electricity_charges || 0)
        + parseFloat(unit?.water_charges || 0)
      return {
        tenancy:     t,
        tenantName:  t.profiles?.full_name || '—',
        unitNumber:  t.units?.unit_number  || '—',
        propertyName: t.units?.properties?.name || '—',
        monthlyRent,
        amount,
      }
    }).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount)

    setOutstandingList(outstanding)
    setLoading(false)
  }

  const filteredPayments = payments.filter(p => {
    if (filterStatus  && p.status     !== filterStatus)  return false
    if (filterTenancy && p.tenancy_id !== filterTenancy) return false
    return true
  })

  function openMarkModal(tenancyId = null) {
    const t = tenancyId ? tenancies.find(t => t.id === tenancyId) : null
    const u = t ? units.find(u => u.id === t.unit_id) : null
    const totalRent = t ? parseFloat(t.monthly_rent||0) + parseFloat(u?.electricity_charges||0) + parseFloat(u?.water_charges||0) : ''
    setMarkModal({ tenancyId, year: now.getFullYear(), month: now.getMonth()+1, selectTenant: !tenancyId })
    setForm({ amount: totalRent || '', paid_date: now.toISOString().split('T')[0], payment_method:'Bank Transfer', note:'' })
  }

  async function confirmPayment() {
    if (!markModal.tenancyId || !form.amount || !form.paid_date) return
    setSaving(true)
    const existing = payments.find(p =>
      p.tenancy_id === markModal.tenancyId &&
      p.period_year === markModal.year &&
      p.period_month === markModal.month
    )
    const payload = {
      tenancy_id: markModal.tenancyId, period_year: markModal.year,
      period_month: markModal.month, amount: parseFloat(form.amount),
      paid_date: form.paid_date, payment_method: form.payment_method,
      note: form.note, status: 'confirmed', submitted_by: 'landlord',
      confirmed_at: new Date().toISOString(), confirmed_by: profile.id,
    }
    if (existing) {
      await supabase.from('payments').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('payments').insert(payload)
    }
    setSaving(false); setMarkModal(null); fetchData()
  }

  async function confirmPending(paymentId) {
    await supabase.from('payments').update({
      status:'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: profile.id,
    }).eq('id', paymentId)
    fetchData()
  }

  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))
  const pendingCount = payments.filter(p => p.status === 'pending').length
  const totalOutstanding = outstandingList.reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <PageHeader title="Payments" sub="All rent payment records">
        <Button variant="ghost" onClick={() => openMarkModal()}>+ Mark Payment</Button>
      </PageHeader>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber)', borderRadius:'var(--radius)', padding:'10px 16px', marginBottom:'1rem', fontSize:13, color:'var(--amber-text)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>⏳ {pendingCount} payment{pendingCount > 1 ? 's' : ''} awaiting confirmation</span>
          <Button size="sm" variant="gold" onClick={() => { setActiveTab('all'); setFilterStatus('pending') }}>View Pending</Button>
        </div>
      )}

      {/* Outstanding alert */}
      {totalOutstanding > 0 && (
        <div style={{ background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:'var(--radius)', padding:'10px 16px', marginBottom:'1rem', fontSize:13, color:'var(--red-text)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>⚠ Total outstanding: <strong>{LKR(totalOutstanding)}</strong> across {outstandingList.length} tenant{outstandingList.length > 1 ? 's' : ''}</span>
          <Button size="sm" variant="danger" onClick={() => setActiveTab('outstanding')}>View Outstanding</Button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {['all','outstanding'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding:'8px 18px', border:'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14,
            color: activeTab === tab ? 'var(--accent)' : 'var(--text2)', fontWeight: activeTab === tab ? 600 : 400,
            marginBottom:'-1px',
          }}>
            {tab === 'all' ? 'All Payments' : `Outstanding (${outstandingList.length})`}
          </button>
        ))}
      </div>

      {/* ── Outstanding Tab ── */}
      {activeTab === 'outstanding' && (
        <Table
          headers={['Tenant', 'Property', 'Unit', 'Monthly Rent', 'Outstanding', 'Action']}
          empty={{ title:'No outstanding balances', sub:'All tenants are up to date.' }}>
          {outstandingList.map((r, i) => (
            <Tr key={i}>
              <Td><strong>{r.tenantName}</strong></Td>
              <Td style={{ color:'var(--text2)', fontSize:13 }}>{r.propertyName}</Td>
              <Td><Badge variant="blue">{r.unitNumber}</Badge></Td>
              <Td><span style={{ fontFamily:'monospace', fontSize:13 }}>{LKR(r.monthlyRent)}</span></Td>
              <Td><span style={{ fontFamily:'monospace', fontSize:13, color:'var(--red-text)', fontWeight:600 }}>{LKR(r.amount)}</span></Td>
              <Td>
                <Button size="sm" variant="success" onClick={() => { openMarkModal(r.tenancy.id); setActiveTab('all') }}>
                  + Mark Payment
                </Button>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* ── All Payments Tab ── */}
      {activeTab === 'all' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, background:'var(--surface)', color:'var(--text)' }}>
              <option value="">All Statuses</option>
              <option value="confirmed">✓ Confirmed</option>
              <option value="pending">⏳ Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <select value={filterTenancy} onChange={e => setFilterTenancy(e.target.value)}
              style={{ padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, background:'var(--surface)', color:'var(--text)' }}>
              <option value="">All Tenants</option>
              {tenancies.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name} — {t.units?.unit_number}</option>)}
            </select>
            {(filterStatus || filterTenancy) && (
              <Button size="sm" variant="ghost" onClick={() => { setFilterStatus(''); setFilterTenancy('') }}>Clear Filters</Button>
            )}
          </div>

          <Table
            headers={['Tenant', 'Unit', 'Period', 'Amount', 'Method', 'Date', 'Status', 'Actions']}
            empty={{ title:'No payment records', sub:'Records appear once payments are submitted or marked.' }}>
            {filteredPayments.map(p => {
              const badgeV = p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
              const badgeL = p.status === 'confirmed' ? '✓ Confirmed' : p.status === 'pending' ? '⏳ Pending' : 'Overdue'
              return (
                <Tr key={p.id}>
                  <Td><strong>{p.tenancies?.profiles?.full_name || '—'}</strong></Td>
                  <Td style={{ color:'var(--text2)' }}>{p.tenancies?.units?.unit_number || '—'}</Td>
                  <Td style={{ color:'var(--text2)' }}>{MONTHS[p.period_month-1]} {p.period_year}</Td>
                  <Td><span style={{ fontFamily:'monospace', fontSize:13 }}>{LKR(p.amount)}</span></Td>
                  <Td style={{ color:'var(--text2)', fontSize:13 }}>{p.payment_method || '—'}</Td>
                  <Td style={{ color:'var(--text2)' }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-LK') : '—'}</Td>
                  <Td><Badge variant={badgeV}>{badgeL}</Badge></Td>
                  <Td>
                    <div style={{ display:'flex', gap:6 }}>
                      {p.status === 'pending' && (
                        <Button size="sm" variant="success" onClick={() => confirmPending(p.id)}>✓ Confirm</Button>
                      )}
                      {p.receipt_image && (
                        <Button size="sm" variant="ghost" onClick={() => setReceiptModal(p)}>Receipt</Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        </>
      )}

      {/* Mark Payment Modal */}
      <Modal open={!!markModal} onClose={() => setMarkModal(null)} title="Mark Payment as Confirmed">
        {markModal?.selectTenant && (
          <Select label="Tenant *" value={markModal.tenancyId || ''} onChange={e => {
            const t = tenancies.find(t => t.id === e.target.value)
            const u = t ? units.find(u => u.id === t.unit_id) : null
            const total = t ? parseFloat(t.monthly_rent||0) + parseFloat(u?.electricity_charges||0) + parseFloat(u?.water_charges||0) : ''
            setMarkModal(m => ({ ...m, tenancyId: e.target.value }))
            setForm(f => ({ ...f, amount: total || '' }))
          }}>
            <option value="">Select tenant</option>
            {tenancies.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name} — {t.units?.unit_number}</option>)}
          </Select>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Select label="Month" value={markModal?.month || now.getMonth()+1} onChange={e => setMarkModal(m => ({ ...m, month: parseInt(e.target.value) }))}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </Select>
          <Input label="Year" type="number" value={markModal?.year || now.getFullYear()} onChange={e => setMarkModal(m => ({ ...m, year: parseInt(e.target.value) }))} />
        </div>
        <Input label="Amount (LKR) *"  type="number" value={form.amount}      onChange={set('amount')} />
        <Input label="Payment Date *"  type="date"   value={form.paid_date}   onChange={set('paid_date')} />
        <Select label="Payment Method" value={form.payment_method} onChange={set('payment_method')}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Input label="Note" value={form.note} onChange={set('note')} placeholder="Optional note" />
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={saving} variant="success" onClick={confirmPayment}>✓ Mark as Confirmed</Button>
          <Button variant="ghost" onClick={() => setMarkModal(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Payment Receipt">
        {receiptModal && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1rem' }}>
              {[
                ['Tenant', receiptModal.tenancies?.profiles?.full_name],
                ['Unit',   receiptModal.tenancies?.units?.unit_number],
                ['Period', `${MONTHS[receiptModal.period_month-1]} ${receiptModal.period_year}`],
                ['Amount', LKR(receiptModal.amount)],
                ['Method', receiptModal.payment_method || '—'],
                ['Date',   receiptModal.paid_date ? new Date(receiptModal.paid_date).toLocaleDateString('en-LK') : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'8px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                  <div style={{ fontWeight:500, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
            {receiptModal.note && <p style={{ fontSize:13, color:'var(--text2)', marginBottom:'1rem' }}>Note: {receiptModal.note}</p>}
            {receiptModal.receipt_image
              ? <img src={receiptModal.receipt_image} alt="Receipt" style={{ maxWidth:'100%', borderRadius:'var(--radius)', border:'1px solid var(--border)' }} />
              : <p style={{ color:'var(--text3)', fontSize:13 }}>No receipt uploaded.</p>
            }
          </div>
        )}
      </Modal>
    </div>
  )
}
