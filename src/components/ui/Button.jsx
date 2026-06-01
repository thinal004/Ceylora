export default function Button({ children, variant = 'primary', size = 'md', fullWidth, loading, onClick, type = 'button', disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, fontFamily: 'inherit', fontWeight: 500, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--radius)', transition: 'all 0.15s',
    opacity: disabled || loading ? 0.6 : 1, width: fullWidth ? '100%' : 'auto',
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '9px 18px', fontSize: 14 },
    lg: { padding: '12px 24px', fontSize: 15 },
  }
  const variants = {
    primary:  { background: 'var(--accent)',    color: 'var(--accent-fg)' },
    ghost:    { background: 'transparent',       color: 'var(--text2)',   border: '1px solid var(--border)' },
    danger:   { background: 'var(--red-bg)',     color: 'var(--red-text)' },
    success:  { background: 'var(--green-bg)',   color: 'var(--green-text)' },
    gold:     { background: 'var(--gold-bg)',    color: 'var(--gold)' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {loading && <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />}
      {children}
    </button>
  )
}
