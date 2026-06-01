export default function Badge({ children, variant = 'default' }) {
  const variants = {
    green:   { background: 'var(--green-bg)',  color: 'var(--green-text)' },
    red:     { background: 'var(--red-bg)',    color: 'var(--red-text)' },
    amber:   { background: 'var(--amber-bg)',  color: 'var(--amber-text)' },
    blue:    { background: 'var(--blue-bg)',   color: 'var(--blue-text)' },
    gold:    { background: 'var(--gold-bg)',   color: 'var(--gold)' },
    default: { background: 'var(--surface2)',  color: 'var(--text2)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      ...variants[variant]
    }}>{children}</span>
  )
}
