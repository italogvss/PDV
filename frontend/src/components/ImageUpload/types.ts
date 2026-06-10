export interface Props {
  /** Presigned URL de leitura já resolvida pelo backend. */
  currentUrl?: string | null
  onUpload: (file: File) => void
  onRemove?: () => void
  isLoading?: boolean
  /** square: produto/serviço · circle: avatar/logo. Padrão: square. */
  shape?: 'square' | 'circle'
  /** Largura em px. Padrão: 120. Também é a altura quando `fullHeight` é falso. */
  size?: number
  /** Faz a altura preencher o container pai (mantém `size` como largura). */
  fullHeight?: boolean
  /** Texto auxiliar abaixo da área (ex.: "Foto do produto"). */
  label?: string
  disabled?: boolean
}
