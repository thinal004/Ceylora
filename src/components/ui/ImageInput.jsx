/**
 * ImageInput — Reusable image picker with client-side compression.
 * Compresses images to max 800px and ~150KB before converting to Base64.
 * Stores as data URI string — no file storage needed.
 */

import { useRef, useState } from 'react'

const MAX_SIZE_PX  = 800    // max width or height in pixels
const QUALITY      = 0.75   // JPEG quality (0–1)
const MAX_BYTES    = 200000 // ~200KB max after compression

export default function ImageInput({ label, value, onChange, hint }) {
  const inputRef        = useRef()
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(value || null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.')
      return
    }

    try {
      const compressed = await compressImage(file)
      if (compressed.length > MAX_BYTES * 1.4) { // base64 is ~33% larger
        setError('Image is too large even after compression. Please use a smaller image.')
        return
      }
      setPreview(compressed)
      onChange(compressed)
    } catch (err) {
      setError('Failed to process image. Please try another file.')
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img
          if (width > MAX_SIZE_PX || height > MAX_SIZE_PX) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE_PX) / width)
              width  = MAX_SIZE_PX
            } else {
              width  = Math.round((width * MAX_SIZE_PX) / height)
              height = MAX_SIZE_PX
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width  = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', QUALITY))
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function remove() {
    setPreview(null)
    onChange(null)
  }

  return (
    <div style={{ marginBottom:'1rem' }}>
      {label && (
        <label style={{ display:'block', fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:6 }}>
          {label}
        </label>
      )}

      {preview ? (
        <div style={{ position:'relative', display:'inline-block' }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: '100%', maxWidth: 240, height: 160,
              objectFit: 'cover', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', display: 'block',
            }}
          />
          <button
            type="button"
            onClick={remove}
            style={{
              position:'absolute', top:6, right:6,
              background:'rgba(0,0,0,0.6)', color:'#fff',
              border:'none', borderRadius:'50%',
              width:24, height:24, cursor:'pointer',
              fontSize:14, lineHeight:'24px', textAlign:'center',
              fontFamily:'inherit',
            }}
          >×</button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--text3)',
            fontSize: 13,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
          <div>Click to upload image</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG, WEBP — auto compressed</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display:'none' }}
      />

      {error && (
        <div style={{ color:'var(--red-text)', fontSize:12, marginTop:6 }}>{error}</div>
      )}
      {hint && !error && (
        <div style={{ color:'var(--text3)', fontSize:12, marginTop:4 }}>{hint}</div>
      )}
    </div>
  )
}
