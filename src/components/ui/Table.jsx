export default function Table({ headers, children, empty }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      {children ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 12,
                    fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '0.5px', borderBottom: '1px solid var(--border)',
                    background: 'var(--surface2)', fontFamily: 'Figtree, sans-serif',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <p style={{ color: 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>{empty?.title || 'No records yet'}</p>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>{empty?.sub || ''}</p>
        </div>
      )}
    </div>
  )
}

export function Tr({ children, onClick }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </tr>
  )
}

export function Td({ children, style }) {
  return (
    <td style={{ padding: '11px 14px', fontSize: 14, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', ...style }}>
      {children}
    </td>
  )
}
