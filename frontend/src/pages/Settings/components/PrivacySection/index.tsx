import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import MarkdownRenderer from '../../../../components/MarkdownRenderer'

export default function PrivacySection() {
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    fetch('/legal/politica-de-privacidade.md')
      .then((r) => r.text())
      .then(setContent)
  }, [])

  return (
    <SettingCard title="Política de Privacidade" subtitle="Como tratamos os dados da sua conta e do seu negócio">
      <Box sx={{ px: 4, py: 3 }}>
        {content ? (
          <MarkdownRenderer content={content} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
    </SettingCard>
  )
}
