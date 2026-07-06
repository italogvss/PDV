import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import MarkdownRenderer from '../../../../components/MarkdownRenderer'

export default function UseTermsSection() {
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    fetch('/legal/termos-de-uso.md')
      .then((r) => r.text())
      .then(setContent)
  }, [])

  return (
    <SettingCard
      title="Termos de Uso"
      subtitle="Termos de uso e contrato da aplicação"
      maxContentHeight="calc(100vh - 320px)"
    >
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
