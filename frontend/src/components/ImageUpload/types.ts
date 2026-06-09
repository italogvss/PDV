export interface Props {
  /** Presigned URL de leitura já resolvida pelo backend. */
  currentUrl?: string | null
  onUpload: (file: File) => void
  onRemove?: () => void
  isLoading?: boolean
  /** square: produto/serviço · circle: avatar/logo. Padrão: square. */
  shape?: 'square' | 'circle'
  /** Tamanho em px. Padrão: 120. */
  size?: number
  /** Texto auxiliar abaixo da área (ex.: "Foto do produto"). */
  label?: string
  disabled?: boolean
}
