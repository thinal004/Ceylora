export default function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.5rem',
      boxShadow: 'var(--shadow)', ...style
    }}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, sub, color, delay = 0 }) {
  const colors = {
    green:  'var(--green)',
    red:    'var(--red)',
    amber:  'var(--amber)',
    gold:   'var(--gold)',
    accent: 'var(--accent)',
    default:'var(--text)',
  }
  return (
    <div className={`fade-up fade-up-${delay}`} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontFamily: 'Instrument Serif, serif', color: colors[color] || colors.default, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
