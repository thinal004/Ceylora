export default function PageHeader({ title, sub, action }) {
  return (
    <div className="fade-up" style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem',
    }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'Instrument Serif, serif', fontWeight: 400, letterSpacing: '-0.3px' }}>{title}</h1>
        {sub && <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 3 }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
