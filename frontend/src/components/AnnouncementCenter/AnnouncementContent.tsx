import { Box } from '@mui/material'
import MarkdownRenderer from '../MarkdownRenderer'

interface AnnouncementContentProps {
  imageUrl?: string
  body: string
}

// Corpo de um aviso editorial: imagem opcional no topo + markdown. Compartilhado entre o feed do
// lojista e a pré-visualização do admin — é o que garante que o preview seja idêntico ao real.
export default function AnnouncementContent({ imageUrl, body }: AnnouncementContentProps) {
  return (
    <>
      {imageUrl && (
        <Box component="img" src={imageUrl} alt="" sx={{ width: '100%', borderRadius: 2, mb: 2 }} />
      )}
      <MarkdownRenderer content={body} />
    </>
  )
}
