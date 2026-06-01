import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, getSignedReceiptUrl } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

export default function Payments() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [tenancies, setTenancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTenancy, setFilterTenancy] = useState('')
  const [markModal, setMarkModal] = useState(null)
  const [receiptModal, setReceiptModal] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [form, setForm] = useState({ amount: '', paid_date: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', profile.id)
    const pIds = (props || []).map(p => p.id)
    if (!pIds.length) { setLoading(false); return }

    const { data: units } = await supabase.from('units').select('id').in('property_id', pIds)
    const uIds = (units || []).map(u => u.id)

    const { data: ten } = await supabase.from('tenancies')
      .select('id, monthly_rent, units(unit_number), profiles:tenant_id(full_name)')
      .in('unit_id', uIds).eq('is_active', true)

    setTenancies(ten || [])

    const tenIds = (ten || []).map(t => t.id)
    if (!tenIds.length) { setLoading(false); return }

    const { data: pays } = await supabase.from('payments')
      .select('*, tenancies(monthly_rent, units(unit_number), profiles:tenant_id(full_name))')
      .in('tenancy_id', tenIds)
      .order('created_at', { ascending: false })

    setPayments(pays || [])
    setLoading(false)
  }

  function filtered() {
    return payments.filter(p => {
      if (filterStatus && p.status !== filterStatus) return false
      if (filterTenancy && p.tenancy_id !== filterTenancy) return false
      return true
    })
  }

  async function openMarkModal(tenancyId, year, month) {
    const tenancy = tenancies.find(t => t.id === tenancyId)
    setMarkModal({ tenancyId, year, month, tenancy })
    setForm({ amount: tenancy?.monthly_rent || '', paid_date: new Date().toISOString().split('T')[0], note: '' })
  }

  async function confirmPayment() {
    if (!form.amount || !form.paid_date) return
    setSaving(true)
    const existing = payments.find(p => p.tenancy_id === markModal.tenancyId && p.period_year === markModal.year && p.period_month === markModal.month)
    if (existing) {
      await supabase.from('payments').update({ status: 'confirmed', amount: parseFloat(form.amount), paid_date: form.paid_date, note: form.note, confirmed_at: new Date().toISOString(), confirmed_by: profile.id, submitted_by: 'landlord' }).eq('id', existing.id)
    } else {
      await supabase.from('payments').insert({ tenancy_id: markModal.tenancyId, period_year: markModal.year, period_month: markModal.month, amount: parseFloat(form.amount), paid_date: form.paid_date, note: form.note, status: 'confirmed', submitted_by: 'landlord', confirmed_at: new Date().toISOString(), confirmed_by: profile.id })
    }
    setSaving(false); setMarkModal(null); fetchData()
  }

  async function confirmPending(paymentId) {
    await supabase.from('payments').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: profile.id }).eq('id', paymentId)
    fetchData()
  }

  async function openReceipt(p) {
    setReceiptModal(p); setReceiptUrl(null)
    if (p.receipt_path) {
      try { const url = await getSignedReceiptUrl(p.receipt_path); setReceiptUrl(url) } catch {}
    }
  }

  const now = new Date()
  const set = f => e => setForm(x => ({ ...x, [f]: e.target.value }))

  return (
    <div>
      <PageHeader title="Payments" sub="All rent payment records">
        <div />
      </PageHeader>

      {/* Filters + Quick Mark */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 14, background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={filterTenancy} onChange={e => setFilterTenancy(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 14, background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="">All Tenants</option>
          {tenancies.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name} — {t.units?.unit_number}</option>)}
        </select>
        <Button variant="ghost" onClick={() => {
          const month = now.getMonth() + 1; const year = now.getFullYear()
          setMarkModal({ tenancyId: null, year, month, selectTenant: true })
          setForm({ amount: '', paid_date: now.toISOString().split('T')[0], note: '' })
        }}>+ Mark Payment</Button>
      </div>

      <Table
        headers={['Tenant', 'Unit', 'Period', 'Amount', 'Paid Date', 'Status', 'Actions']}
        empty={{ title: 'No payment records', sub: 'Records appear here once payments are submitted or marked.' }}>
        {filtered().length > 0 && filtered().map(p => {
          const badgeV = p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
          const badgeL = p.status === 'confirmed' ? '✓ Confirmed' : p.status === 'pending' ? '⏳ Pending' : 'Overdue'
          return (
            <Tr key={p.id}>
              <Td><strong>{p.tenancies?.profiles?.full_name || '—'}</strong></Td>
              <Td>{p.tenancies?.units?.unit_number || '—'}</Td>
              <Td style={{ color: 'var(--text2)' }}>{MONTHS[p.period_month - 1]} {p.period_year}</Td>
              <Td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{LKR(p.amount)}</span></Td>
              <Td style={{ color: 'var(--text2)' }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-LK') : '—'}</Td>
              <Td><Badge variant={badgeV}>{badgeL}</Badge></Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.status === 'pending' && <Button size="sm" variant="success" onClick={() => confirmPending(p.id)}>Confirm</Button>}
                  {p.receipt_path && <Button size="sm" variant="ghost" onClick={() => openReceipt(p)}>Receipt</Button>}
                </div>
              </Td>
            </Tr>
          )
        })}
      </Table>

      {/* Mark Payment Modal */}
      <Modal open={!!markModal} onClose={() => setMarkModal(null)} title="Mark Payment">
        {markModal?.selectTenant && (
          <Select label="Tenant *" value={markModal.tenancyId || ''} onChange={e => { const t = tenancies.find(t => t.id === e.target.value); setMarkModal(m => ({ ...m, tenancyId: e.target.value })); setForm(f => ({ ...f, amount: t?.monthly_rent || '' })) }}>
            <option value="">Select tenant</option>
            {tenancies.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name} — {t.units?.unit_number}</option>)}
          </Select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Select label="Month" value={markModal?.month || now.getMonth()+1} onChange={e => setMarkModal(m => ({ ...m, month: parseInt(e.target.value) }))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </Select>
          <Input label="Year" type="number" value={markModal?.year || now.getFullYear()} onChange={e => setMarkModal(m => ({ ...m, year: parseInt(e.target.value) }))} />
        </div>
        <Input label="Amount (LKR) *" type="number" value={form.amount} onChange={set('amount')} />
        <Input label="Payment Date *" type="date" value={form.paid_date} onChange={set('paid_date')} />
        <Input label="Note" value={form.note} onChange={set('note')} placeholder="e.g. Cash payment" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button fullWidth loading={saving} variant="success" onClick={confirmPayment}>✓ Mark as Confirmed</Button>
          <Button variant="ghost" onClick={() => setMarkModal(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Payment Receipt">
        {receiptModal && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              {[
                ['Tenant', receiptModal.tenancies?.profiles?.full_name],
                ['Unit', receiptModal.tenancies?.units?.unit_number],
                ['Period', `${MONTHS[receiptModal.period_month - 1]} ${receiptModal.period_year}`],
                ['Amount', LKR(receiptModal.amount)],
                ['Date', receiptModal.paid_date ? new Date(receiptModal.paid_date).toLocaleDateString('en-LK') : '—'],
                ['Status', receiptModal.status],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
                  <div style={{ fontWeight: 500, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            {receiptModal.note && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>Note: {receiptModal.note}</p>}
            {receiptModal.receipt_path ? (
              receiptUrl ? <img src={receiptUrl} alt="Receipt" style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
              : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading receipt image...</p>
            ) : <p style={{ color: 'var(--text3)', fontSize: 13 }}>No receipt image uploaded.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
