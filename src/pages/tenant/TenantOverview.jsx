import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, LKR, MONTHS } from '../../lib/supabase'
import ImageInput from '../../components/ui/ImageInput'
import { StatCard } from '../../components/ui/Card'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const PAYMENT_METHODS = ['Bank Transfer','Cash','Cheque','Online Transfer','Other']

export default function TenantOverview() {
  const { profile } = useAuth()
  const [tenancy, setTenancy]       = useState(null)
  const [payments, setPayments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [payModal, setPayModal]     = useState(null)
  const [receiptModal, setReceiptModal] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [form, setForm] = useState({ amount:'', paid_date:'', payment_method:'Bank Transfer', note:'', receipt_image:null })
  const [uploading, setUploading]   = useState(false)
  const [err, setErr]               = useState('')

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: ten } = await supabase.from('tenancies')
      .select('*, units(unit_number, monthly_rent, electricity_charges, water_charges, deposit_amount, floor, properties(name, address, city))')
      .eq('tenant_id', profile.id)
      .eq('is_active', true)
      .single()

    if (!ten) { setLoading(false); return }
    setTenancy(ten)

    const { data: pays } = await supabase.from('payments')
      .select('*')
      .eq('tenancy_id', ten.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })

    setPayments(pays || [])
    setLoading(false)
  }

  function getPayment(year, month) {
    return payments.find(p => p.period_year === year && p.period_month === month)
  }

  function openPayModal(month, year) {
    const existing = getPayment(year, month)
    setErr('')
    setForm({
      amount:         existing?.amount || tenancy?.monthly_rent || '',
      paid_date:      existing?.paid_date || now.toISOString().split('T')[0],
      payment_method: existing?.payment_method || 'Bank Transfer',
      note:           existing?.note || '',
      receipt_image:  existing?.receipt_image || null,
    })
    setPayModal({ month, year })
  }

  async function submitPayment() {
    if (!form.amount || !form.paid_date) { setErr('Amount and date are required.'); return }
    setUploading(true); setErr('')
    try {
      const existing = getPayment(payModal.year, payModal.month)
      const payload = {
        tenancy_id:     tenancy.id,
        period_year:    payModal.year,
        period_month:   payModal.month,
        amount:         parseFloat(form.amount),
        paid_date:      form.paid_date,
        payment_method: form.payment_method,
        note:           form.note,
        status:         'pending',
        submitted_by:   'tenant',
        receipt_image:  form.receipt_image || null,
      }
      if (existing) {
        await supabase.from('payments').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('payments').insert(payload)
      }
      setPayModal(null); fetchData()
    } catch (e) {
      setErr(e.message || 'Failed to submit payment.')
    }
    setUploading(false)
  }

  function openReceipt(p) {
    setReceiptModal(p)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'2px solid var(--border)', borderTopColor:'var(--accent2)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!tenancy) return (
    <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🏠</div>
      <p style={{ fontWeight:500, marginBottom:6 }}>No active tenancy</p>
      <p style={{ color:'var(--text2)', fontSize:14 }}>Your landlord hasn't assigned you to a unit yet. Please contact them.</p>
    </div>
  )

  const paidMonths  = payments.filter(p => p.status === 'confirmed').length
  const totalPaid   = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + Number(p.amount), 0)
  const currentPay  = getPayment(currentYear, currentMonth)
  const outstanding = payments.filter(p => p.status !== 'confirmed' && p.period_year === currentYear && p.period_month <= currentMonth).length

  return (
    <div>
      <PageHeader
        title={tenancy.units?.unit_number}
        sub={`${tenancy.units?.properties?.name} · ${tenancy.units?.properties?.address}, ${tenancy.units?.properties?.city}`}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12, marginBottom:'2rem' }}>
        <StatCard delay={1} label="Monthly Rent"    value={LKR(tenancy.monthly_rent)}                                     color="accent" />
        <StatCard delay={2} label="Months Paid"     value={`${paidMonths} / 12`}                                          color="green"  sub={currentYear.toString()} />
        <StatCard delay={3} label="Total Paid"      value={LKR(totalPaid)}                                                 color="green"  sub={currentYear.toString()} />
        <StatCard delay={4} label="This Month"
          value={currentPay?.status === 'confirmed' ? '✓ Paid' : currentPay?.status === 'pending' ? 'Pending' : 'Not Paid'}
          color={currentPay?.status === 'confirmed' ? 'green' : currentPay?.status === 'pending' ? 'amber' : 'red'} />
      </div>

      {/* Unit Info */}
      {(tenancy.units?.electricity_charges > 0 || tenancy.units?.water_charges > 0 || tenancy.units?.floor) && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.25rem', marginBottom:'1.5rem', display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
          {tenancy.units?.floor && <div style={{ fontSize:13, color:'var(--text2)' }}>🏢 Floor: <strong>{tenancy.units.floor}</strong></div>}
          {tenancy.units?.electricity_charges > 0 && <div style={{ fontSize:13, color:'var(--text2)' }}>⚡ Electricity: <strong>{LKR(tenancy.units.electricity_charges)}</strong></div>}
          {tenancy.units?.water_charges > 0 && <div style={{ fontSize:13, color:'var(--text2)' }}>💧 Water: <strong>{LKR(tenancy.units.water_charges)}</strong></div>}
          {tenancy.units?.deposit_amount > 0 && <div style={{ fontSize:13, color:'var(--text2)' }}>🔒 Deposit: <strong>{LKR(tenancy.units.deposit_amount)}</strong></div>}
        </div>
      )}

      <h2 style={{ fontFamily:'Instrument Serif, serif', fontSize:'1.2rem', fontWeight:400, marginBottom:'1rem' }}>{currentYear} Payment Status</h2>
      <div style={{ display:'grid', gap:10 }}>
        {MONTHS.map((monthName, idx) => {
          const month   = idx + 1
          const pay     = getPayment(currentYear, month)
          const isFuture = month > currentMonth
          const badgeV  = pay?.status === 'confirmed' ? 'green' : pay?.status === 'pending' ? 'amber' : isFuture ? 'default' : 'red'
          const badgeL  = pay?.status === 'confirmed' ? `✓ Paid — ${LKR(pay.amount)}` : pay?.status === 'pending' ? '⏳ Awaiting confirmation' : isFuture ? 'Upcoming' : '✗ Not paid'

          return (
            <div key={month} className={`fade-up fade-up-${Math.min(idx+1,7)}`} style={{
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)',
              padding:'1rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between',
              gap:'1rem', flexWrap:'wrap', boxShadow:'var(--shadow)',
            }}>
              <div>
                <div style={{ fontWeight:500, fontSize:15 }}>{monthName} {currentYear}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                  {pay?.paid_date ? `Paid on ${new Date(pay.paid_date).toLocaleDateString('en-LK')}` : isFuture ? 'Not due yet' : 'Not paid'}
                  {pay?.payment_method && ` · ${pay.payment_method}`}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Badge variant={badgeV}>{badgeL}</Badge>
                {pay?.status === 'confirmed' && pay.receipt_image && (
                  <Button size="sm" variant="ghost" onClick={() => openReceipt(pay)}>Receipt</Button>
                )}
                {pay?.status !== 'confirmed' && !isFuture && (
                  <Button size="sm" onClick={() => openPayModal(month, currentYear)}>
                    {pay?.status === 'pending' ? 'Update' : 'Pay Now'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)}
        title={`Submit Payment — ${payModal ? MONTHS[payModal.month - 1] + ' ' + payModal.year : ''}`}>
        <div style={{ background:'var(--blue-bg)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:'1rem', fontSize:13, color:'var(--blue-text)' }}>
          ℹ️ Your landlord will confirm this payment. It will show as "Awaiting confirmation" until approved.
        </div>
        <Input label="Amount Paid (LKR) *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        <Input label="Payment Date *" type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
        <Select label="Payment Method" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <ImageInput label="Receipt Image (optional)" value={form.receipt_image} onChange={v => setForm(f => ({ ...f, receipt_image: v }))} hint="Photo of bank slip or receipt — auto compressed" />
        <Input label="Note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Bank transfer ref #123456" />
        {err && <div style={{ background:'var(--red-bg)', color:'var(--red-text)', fontSize:13, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:12 }}>{err}</div>}
        <div style={{ display:'flex', gap:8 }}>
          <Button fullWidth loading={uploading} variant="success" onClick={submitPayment}>Submit Payment</Button>
          <Button variant="ghost" onClick={() => setPayModal(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Payment Receipt">
        {receiptModal && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:'1rem' }}>
              {[
                ['Month',   `${MONTHS[receiptModal.period_month - 1]} ${receiptModal.period_year}`],
                ['Amount',  LKR(receiptModal.amount)],
                ['Method',  receiptModal.payment_method || '—'],
                ['Date',    receiptModal.paid_date ? new Date(receiptModal.paid_date).toLocaleDateString('en-LK') : '—'],
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
