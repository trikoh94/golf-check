import { supabase } from './supabase'

/**
 * 이미지 파일을 압축 후 Supabase Storage에 업로드
 * @param {File} file
 * @param {'inspection-photos'|'work-photos'} bucket
 * @param {string} folder - 경로 prefix (예: '2026-06-25/green')
 * @returns {Promise<string>} public URL
 */
export async function uploadPhoto(file, bucket, folder) {
  // 압축 (canvas, max 700px, quality 0.6)
  const compressed = await compressToBlob(file)
  const ext = 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return publicUrl
}

function compressToBlob(file, maxPx = 700, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('compress fail')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}
