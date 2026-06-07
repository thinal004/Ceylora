import { useState, useEffect, useCallback } from 'react'
import { supabase, evictDbCache } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const statusBadge = (active) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:5,
    fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
    background: active ? 'var(--green-bg)' : 'var(--surface2)',
    color: active ? 'var(--green-text)' : 'var(--text3)',
  }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background: active ? 'var(--green)' : 'var(--text3)' }} />
    {active ? 'Active' : 'Inactive'}
  </span>
)

const EMPTY = {
  landlord_id: '',
  db_url: '',
  db_anon_key: '',
  db_label: '',
  is_active: true,
}

export default function AdminConnections() {
  const [connections, setConnections]   = useState([])
  const [landlords, setLandlords]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState(null)   // null = new
  const [form, setForm]                 = useState(EMPTY)
  const [saving, setSaving]             = useState(false)
  const [testing, setTesting]           = useState(false)
  const [testResult, setTestResult]     = useState(null)   // { ok, msg }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [err, setErr]                   = useState('')
  const [success, setSuccess]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: conns }, { data: lls }] = await Promise.all([
      supabase.from('tenant_connections').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, username').eq('role', 'landlord').order('full_name'),
    ])
    setConnections(conns || [])
    setLandlords(lls || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setTestResult(null)
    setErr('')
    setShowModal(true)
  }

  function openEdit(conn) {
    setEditing(conn)
    setForm({
      landlord_id: conn.landlord_id,
      db_url:      conn.db_url,
      db_anon_key: conn.db_anon_key,
      db_label:    conn.db_label || '',
      is_active:   conn.is_active,
    })
    setTestResult(null)
    setErr('')
    setShowModal(true)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // ── Test connection live ─────────────────────────────────────
  async function testConnection() {
    if (!form.db_url || !form.db_anon_key) {
      setTestResult({ ok: false, msg: 'Enter the Supabase URL and Anon Key first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const client = createClient(form.db_url.trim(), form.db_anon_key.trim(), {
        auth: { persistSession: false }
      })
      // Simple health check — query any system view
      const { error } = await client.from('profiles').select('id').limit(1)
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows — that's fine, connection works
        setTestResult({ ok: false, msg: `Connection failed: ${error.message}` })
      } else {
        setTestResult({ ok: true, msg: 'Connection successful! Database is reachable.' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `Error: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    setErr('')
    if (!form.landlord_id) return setErr('Select a landlord.')
    if (!form.db_url)      return setErr('Supabase Project URL is required.')
    if (!form.db_anon_key) return setErr('Anon Key is required.')

    // Basic URL validation
    try { new URL(form.db_url) } catch { return setErr('Invalid Project URL.') }

    setSaving(true)
    const payload = {
      landlord_id: form.landlord_id,
      db_url:      form.db_url.trim(),
      db_anon_key: form.db_anon_key.trim(),
      db_label:    form.db_label.trim() || null,
      is_active:   form.is_active,
    }

    let error
    if (editing) {
      ;({ error } = await supabase.from('tenant_connections').update(payload).eq('id', editing.id))
      if (!error) evictDbCache(form.landlord_id)
    } else {
      ;({ error } = await supabase.from('tenant_connections').insert(payload))
    }

    setSaving(false)
    if (error) return setErr(error.message)

    setSuccess(editing ? 'Connection updated.' : 'Connection added.')
    setTimeout(() => setSuccess(''), 4000)
    setShowModal(false)
    load()
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete() {
    const { error } = await supabase
      .from('tenant_connections')
      .delete()
      .eq('id', deleteTarget.id)
    if (!error) {
      evictDbCache(deleteTarget.landlord_id)
      setSuccess('Connection removed.')
      setTimeout(() => setSuccess(''), 4000)
    }
    setDeleteTarget(null)
    load()
  }

  // ── Toggle active ────────────────────────────────────────────
  async function toggleActive(conn) {
    await supabase
      .from('tenant_connections')
      .update({ is_active: !conn.is_active })
      .eq('id', conn.id)
    evictDbCache(conn.landlord_id)
    load()
  }

  const landlordName = (id) => {
    const l = landlords.find(l => l.id === id)
    return l ? `${l.full_name} (${l.username})` : id
  }

  return (
    <div>
      <PageHeader title="Database Connections" subtitle="Point landlords to their own Supabase database servers">
        <Button onClick={openCreate} size="sm">+ Add Connection</Button>
      </PageHeader>

      {success && (
        <div style={{ background:'var(--green-bg)', color:'var(--green-text)', padding:'10px 16px', borderRadius:'var(--radius)', marginBottom:16, fontSize:14 }}>
          ✓ {success}
        </div>
      )}

      {/* Info banner */}
      <div style={{ background:'var(--blue-bg)', border:'1px solid #BFDBFE', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--blue-text)', display:'flex', gap:10 }}>
        <span>ℹ️</span>
        <div>
          <strong>How it works:</strong> By default all landlords share Ceylora's master database.
          Add a connection here to route a specific landlord's data to their <strong>own Supabase project</strong>.
          Only the <code style={{ background:'#DBEAFE', padding:'1px 5px', borderRadius:3 }}>anon</code> key should be stored — never the service role key.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Loading...</div>
      ) : connections.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:48, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔌</div>
          <h3 style={{ fontFamily:'Instrument Serif, serif', fontWeight:400, marginBottom:8 }}>No custom connections</h3>
          <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>All landlords are using the shared master database.</p>
          <Button onClick={openCreate} size="sm">+ Add First Connection</Button>
        </div>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div className="table-wrapper">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                  {['Landlord','Label','Supabase URL','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map((conn, i) => (
                  <tr key={conn.id} style={{ borderBottom: i < connections.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding:'12px 16px', fontWeight:500 }}>{landlordName(conn.landlord_id)}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text2)' }}>{conn.db_label || <span style={{ color:'var(--text3)' }}>—</span>}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <code style={{ fontSize:12, background:'var(--surface2)', padding:'2px 8px', borderRadius:4, color:'var(--text2)' }}>
                        {conn.db_url.replace('https://', '').slice(0, 40)}{conn.db_url.length > 48 ? '…' : ''}
                      </code>
                    </td>
                    <td style={{ padding:'12px 16px' }}>{statusBadge(conn.is_active)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => openEdit(conn)} style={{ fontSize:12, padding:'4px 10px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontFamily:'inherit', color:'var(--text)' }}>Edit</button>
                        <button onClick={() => toggleActive(conn)} style={{ fontSize:12, padding:'4px 10px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontFamily:'inherit', color: conn.is_active ? 'var(--amber)' : 'var(--green)' }}>
                          {conn.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => setDeleteTarget(conn)} style={{ fontSize:12, padding:'4px 10px', borderRadius:'var(--radius)', border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontFamily:'inherit', color:'var(--red)' }}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div className="modal-box" style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'2rem', width:'100%', maxWidth:560, boxShadow:'var(--shadow-md)', maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontFamily:'Instrument Serif, serif', fontWeight:400, fontSize:'1.5rem', marginBottom:4 }}>
              {editing ? 'Edit Connection' : 'Add Database Connection'}
            </h2>
            <p style={{ color:'var(--text2)', fontSize:13, marginBottom:20 }}>
              Connect a landlord to their own Supabase project.
            </p>

            {/* Landlord select */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:6 }}>Landlord *</label>
              <select
                value={form.landlord_id}
                onChange={e => set('landlord_id', e.target.value)}
                disabled={!!editing}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--radius)', border:'1px solid var(--border)', fontSize:14, fontFamily:'inherit', background: editing ? 'var(--surface2)' : 'var(--surface)', color:'var(--text)' }}>
                <option value="">— Select landlord —</option>
                {landlords.map(l => (
                  <option key={l.id} value={l.id}>{l.full_name} ({l.username})</option>
                ))}
              </select>
            </div>

            <Input label="Connection Label (optional)" value={form.db_label} onChange={e => set('db_label', e.target.value)} placeholder="e.g. Perera Properties Server" />

            <Input label="Supabase Project URL *" value={form.db_url} onChange={e => set('db_url', e.target.value)} placeholder="https://xxxxxxxxxxxxxxxx.supabase.co" />

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:6 }}>Anon Key * <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>(never use service_role key)</span></label>
              <textarea
                value={form.db_anon_key}
                onChange={e => set('db_anon_key', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--radius)', border:'1px solid var(--border)', fontSize:12, fontFamily:'monospace', resize:'vertical', background:'var(--surface)', color:'var(--text)', lineHeight:1.5 }}
              />
            </div>

            <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
              <input type="checkbox" id="isActive" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
              <label htmlFor="isActive" style={{ fontSize:14, cursor:'pointer' }}>Active (route landlord to this database)</label>
            </div>

            {/* Test result */}
            {testResult && (
              <div style={{ background: testResult.ok ? 'var(--green-bg)' : 'var(--red-bg)', color: testResult.ok ? 'var(--green-text)' : 'var(--red-text)', padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:14, fontSize:13 }}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </div>
            )}

            {err && (
              <div style={{ background:'var(--red-bg)', color:'var(--red-text)', padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:14, fontSize:13 }}>
                {err}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="secondary" onClick={testConnection} loading={testing}>
                🔌 Test Connection
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editing ? 'Save Changes' : 'Add Connection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'2rem', width:'100%', maxWidth:420, boxShadow:'var(--shadow-md)' }}>
            <h3 style={{ fontFamily:'Instrument Serif, serif', fontWeight:400, marginBottom:10 }}>Remove Connection?</h3>
            <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>
              This will remove the custom database connection for <strong>{landlordName(deleteTarget.landlord_id)}</strong>.
              They will fall back to the shared master database. This does <em>not</em> delete any data.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
