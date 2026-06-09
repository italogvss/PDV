const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Converte uma imagem para WebP via Canvas API. O arquivo vai direto pro MinIO
 * sem passar pelo backend, então a conversão acontece aqui no navegador.
 */
export function convertToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Falha ao processar imagem.'))
        return
      }

      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) resolve(blob)
          else reject(new Error('Falha ao converter imagem.'))
        },
        'image/webp',
        0.85,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao carregar imagem.'))
    }

    img.src = url
  })
}

/** Valida tipo e tamanho. Retorna a mensagem de erro ou null se válido. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Formato não suportado. Use JPEG, PNG ou WebP.'
  if (file.size > MAX_SIZE_BYTES) return 'Imagem muito grande. Tamanho máximo: 5MB.'
  return null
}
