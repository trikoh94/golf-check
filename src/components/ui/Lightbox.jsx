import { useState } from 'react'
import { useApp } from '../../context/AppContext'

export default function Lightbox() {
  const { lightbox, hideLightbox } = useApp()
  const [idx, setIdx] = useState(0)

  if (!lightbox) return null
  const { photos, index: initIdx } = lightbox
  const current = idx < photos.length ? idx : (initIdx || 0)

  return (
    <div className="lightbox-overlay" onClick={hideLightbox}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={hideLightbox}>✕</button>
        <img src={photos[current]?.dataUrl} alt="" className="lightbox-img" />
        {photos.length > 1 && (
          <div className="lightbox-nav">
            <button onClick={() => setIdx((current - 1 + photos.length) % photos.length)}>◀</button>
            <span>{current + 1} / {photos.length}</span>
            <button onClick={() => setIdx((current + 1) % photos.length)}>▶</button>
          </div>
        )}
      </div>
    </div>
  )
}
