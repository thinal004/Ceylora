export function Input({ label, hint, error, type = 'text', ...props }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
      <input type={type} {...props}
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 14,
          background: 'var(--surface)', color: 'var(--text)', outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
      />
      {hint && !error && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, ...props }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
      <select {...props}
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 14,
          background: 'var(--surface)', color: 'var(--text)', outline: 'none',
        }}>
        {children}
      </select>
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
      <textarea {...props}
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 14,
          background: 'var(--surface)', color: 'var(--text)', outline: 'none',
          resize: 'vertical', minHeight: 80,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
      />
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
