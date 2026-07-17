import { useEffect, useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import SettingCard from '../../../../../components/SettingCard'
import { useUpdateLegalDocument } from '../../../../hooks/useAdmin'
import { formatDateTime } from '../../../../utils/format'
import type { AdminLegalDocument } from '../../../../types/admin.types'

interface Props {
  title: string
  subtitle: string
  document: AdminLegalDocument
}

export default function LegalDocumentCard({ title, subtitle, document }: Props) {
  const updateLegalDocument = useUpdateLegalDocument()
  const [content, setContent] = useState(document.content)

  useEffect(() => {
    setContent(document.content)
  }, [document.content])

  const dirty = content !== document.content

  const handleSave = () => {
    updateLegalDocument.mutate({ type: document.type, content })
  }

  return (
    <SettingCard
      title={title}
      subtitle={subtitle}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Atualizado em {formatDateTime(document.updatedAt)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={!dirty || updateLegalDocument.isPending}
            onClick={handleSave}
          >
            Salvar
          </Button>
        </Box>
      }
    >
      <Box sx={{ px: 4, py: 3 }}>
        <TextField
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fullWidth
          multiline
          minRows={16}
          maxRows={28}
          placeholder="Conteúdo em markdown..."
          sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
        />
      </Box>
    </SettingCard>
  )
}
