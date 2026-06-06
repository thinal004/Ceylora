import { useLang } from '../../contexts/LangContext'

export default function LangSwitch() {
  const { lang, switchLang } = useLang()
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.1)', borderRadius:'var(--radius)', padding:'3px 4px' }}>
      {['en','si'].map(l => (
        <button
          key={l}
          onClick={() => switchLang(l)}
          style={{
            background: lang === l ? 'rgba(255,255,255,0.25)' : 'transparent',
            border: 'none', color: 'inherit', borderRadius: 5,
            padding: '3px 8px', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.5px',
            textTransform: 'uppercase', opacity: lang === l ? 1 : 0.6,
            transition: 'all 0.15s',
          }}
        >
          {l === 'en' ? 'EN' : 'සිං'}
        </button>
      ))}
    </div>
  )
}
