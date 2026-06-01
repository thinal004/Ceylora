import { useEffect } from 'react'
import Button from './Button'

export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 200, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '1rem',
      }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
        padding: '1.75rem', width: '100%', maxWidth,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        animation: 'fadeUp 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'Instrument Serif, serif', fontWeight: 400 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: 20, padding: '2px 6px',
            borderRadius: 6, lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
