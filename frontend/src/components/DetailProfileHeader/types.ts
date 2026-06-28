import type { ReactNode } from 'react'
import type { SvgIconComponent } from '@mui/icons-material'

export interface DetailMetaItem {
  icon: SvgIconComponent
  text: string
}

export interface DetailProfileHeaderProps {
  /** Nome exibido — também usado para gerar as iniciais do avatar. */
  name: string
  /** Cor de fundo do avatar (token do tema ou hex). */
  avatarColor: string
  /** Conteúdo opcional ao lado do nome (ex.: chip). */
  titleAdornment?: ReactNode
  /** Itens da linha de metadados (e-mail, telefone, localização, etc.). */
  meta: DetailMetaItem[]
  isEditing: boolean
  isSaving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDeleteClick: () => void
  /** Rótulo do botão de exclusão/desativação (padrão: "Desativar"). */
  deleteLabel?: string
}
