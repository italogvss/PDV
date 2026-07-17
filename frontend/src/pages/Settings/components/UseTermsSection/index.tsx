import { Box, CircularProgress } from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import MarkdownRenderer from '../../../../components/MarkdownRenderer'
import { useLegalDocument } from '../../../../hooks/useLegalDocument'

export default function UseTermsSection() {
  const { data: content } = useLegalDocument('termos-de-uso')

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
