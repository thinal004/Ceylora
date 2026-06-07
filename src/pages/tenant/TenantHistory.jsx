import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, getSignedReceiptUrl } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Table, { Tr, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LKR = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

export default function TenantHistory() {
  const { profile, db } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [receiptModal, setReceiptModal] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null)

  useEffect(() => { fetchHistory() }, [db])

  async function fetchHistory() {
    const { data: ten } = await db.from('tenancies').select('id').eq('tenant_id', profile.id).eq('is_active', true).single()
    if (!ten) { setLoading(false); return }
    const { data } = await db.from('payments').select('*').eq('tenancy_id', ten.id).order('period_year', { ascending: false }).order('period_month', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  async function openReceipt(p) {
    setReceiptModal(p); setReceiptUrl(null)
    if (p.receipt_path) {
      try { const url = await getSignedReceiptUrl(p.receipt_path); setReceiptUrl(url) } catch {}
    }
  }

  return (
    <div>
      <PageHeader title="Payment History" sub="Your complete payment record" />
      <Table
        headers={['Month', 'Amount', 'Date Paid', 'Submitted', 'Status', 'Receipt']}
        empty={{ title: 'No payment history', sub: 'Submit your first payment from My Unit.' }}>
        {payments.length > 0 && payments.map(p => {
          const badgeV = p.status === 'confirmed' ? 'green' : p.status === 'pending' ? 'amber' : 'red'
          const badgeL = p.status === 'confirmed' ? '✓ Confirmed' : p.status === 'pending' ? '⏳ Pending' : 'Overdue'
          return (
            <Tr key={p.id}>
              <Td><strong>{MONTHS[p.period_month - 1]} {p.period_year}</strong></Td>
              <Td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{LKR(p.amount)}</span></Td>
              <Td style={{ color: 'var(--text2)' }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-LK') : '—'}</Td>
              <Td style={{ color: 'var(--text2)', fontSize: 13 }}>{p.submitted_by === 'tenant' ? 'You' : 'Landlord'}</Td>
              <Td><Badge variant={badgeV}>{badgeL}</Badge></Td>
              <Td>
                {p.receipt_path
                  ? <Button size="sm" variant="ghost" onClick={() => openReceipt(p)}>View</Button>
                  : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
              </Td>
            </Tr>
          )
        })}
      </Table>

      <Modal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Receipt">
        {receiptModal && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
              {[
                ['Month', `${MONTHS[receiptModal.period_month - 1]} ${receiptModal.period_year}`],
                ['Amount', LKR(receiptModal.amount)],
                ['Paid On', receiptModal.paid_date ? new Date(receiptModal.paid_date).toLocaleDateString('en-LK') : '—'],
                ['Status', receiptModal.status],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
                  <div style={{ fontWeight: 500, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            {receiptModal.note && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>Note: {receiptModal.note}</p>}
            {receiptModal.receipt_path
              ? receiptUrl
                ? <img src={receiptUrl} alt="Receipt" style={{ maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading...</p>
              : <p style={{ color: 'var(--text3)', fontSize: 13 }}>No receipt image uploaded.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
